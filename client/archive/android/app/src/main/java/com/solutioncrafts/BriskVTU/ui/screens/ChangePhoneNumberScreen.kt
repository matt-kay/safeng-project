package com.solutioncrafts.BriskVTU.ui.screens

import android.app.Activity
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.google.firebase.FirebaseException
import com.solutioncrafts.BriskVTU.core.auth.UserSessionManager
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChangePhoneNumberScreen(
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { UserSessionManager.getInstance() }

    var step by remember { mutableStateOf(ChangeStep.ENTER_PHONE) }
    var phoneNumber by remember { mutableStateOf("") }
    var selectedCountryCode by remember { mutableStateOf("+234") }
    var otpCode by remember { mutableStateOf("") }
    
    var verificationId by remember { mutableStateOf<String?>(null) }
    var resendToken by remember { mutableStateOf<PhoneAuthProvider.ForceResendingToken?>(null) }

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val fullPhoneNumber = "$selectedCountryCode$phoneNumber"

    val countryCodes = listOf("+1", "+44", "+234", "+91", "+27", "+254")
    var countryMenuExpanded by remember { mutableStateOf(false) }

    val isPhoneValid = phoneNumber.length >= 7
    val isCodeValid = otpCode.length == 6

    fun sendVerificationCode() {
        if (!isPhoneValid) return
        isLoading = true
        errorMessage = null

        val options = PhoneAuthOptions.newBuilder(FirebaseAuth.getInstance())
            .setPhoneNumber(fullPhoneNumber)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(context as Activity)
            .setCallbacks(object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                    // Auto-retrieval or Instant verification
                    otpCode = credential.smsCode ?: ""
                    // In a real app we might proceed automatically here
                }

                override fun onVerificationFailed(e: FirebaseException) {
                    isLoading = false
                    errorMessage = e.localizedMessage
                }

                override fun onCodeSent(
                    vId: String,
                    token: PhoneAuthProvider.ForceResendingToken
                ) {
                    isLoading = false
                    verificationId = vId
                    resendToken = token
                    step = ChangeStep.ENTER_OTP
                }
            })
            .build()
        
        PhoneAuthProvider.verifyPhoneNumber(options)
    }

    fun verifyCode() {
        if (!isCodeValid || verificationId == null) return
        isLoading = true
        errorMessage = null

        val credential = PhoneAuthProvider.getCredential(verificationId!!, otpCode)
        val user = FirebaseAuth.getInstance().currentUser

        if (user != null) {
            user.updatePhoneNumber(credential).addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    // Phone updated in Firebase Auth, sync with backend
                    scope.launch {
                        try {
                            sessionManager.updatePhoneNumber(fullPhoneNumber)
                            isLoading = false
                            onNavigateBack()
                        } catch (e: Exception) {
                            isLoading = false
                            errorMessage = "Failed to sync profile: ${e.message}"
                        }
                    }
                } else {
                    isLoading = false
                    errorMessage = task.exception?.localizedMessage
                }
            }
        } else {
            isLoading = false
            errorMessage = "User not logged in."
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Change Phone Number") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(24.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                if (step == ChangeStep.ENTER_PHONE) {
                    Text("Enter your new phone number", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("We will send a verification code to this number to confirm the change.", color = MaterialTheme.colorScheme.onSurfaceVariant)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        ExposedDropdownMenuBox(
                            expanded = countryMenuExpanded,
                            onExpandedChange = { countryMenuExpanded = it },
                            modifier = Modifier.weight(0.3f)
                        ) {
                            OutlinedTextField(
                                value = selectedCountryCode,
                                onValueChange = {},
                                readOnly = true,
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = countryMenuExpanded) },
                                modifier = Modifier.menuAnchor()
                            )
                            ExposedDropdownMenu(
                                expanded = countryMenuExpanded,
                                onDismissRequest = { countryMenuExpanded = false }
                            ) {
                                countryCodes.forEach { code ->
                                    DropdownMenuItem(
                                        text = { Text(code) },
                                        onClick = {
                                            selectedCountryCode = code
                                            countryMenuExpanded = false
                                        }
                                    )
                                }
                            }
                        }

                        OutlinedTextField(
                            value = phoneNumber,
                            onValueChange = { phoneNumber = it },
                            label = { Text("Phone Number") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.weight(0.7f),
                            singleLine = true
                        )
                    }
                } else {
                    Text("Verify New Number", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text("Enter the 6-digit code sent to $fullPhoneNumber", color = MaterialTheme.colorScheme.onSurfaceVariant)

                    OutlinedTextField(
                        value = otpCode,
                        onValueChange = { if (it.length <= 6) otpCode = it },
                        label = { Text("OTP Code") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    TextButton(onClick = { 
                        step = ChangeStep.ENTER_PHONE 
                        otpCode = ""
                    }) {
                        Text("Back to phone number")
                    }
                }

                if (errorMessage != null) {
                    Text(
                        text = errorMessage ?: "",
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            Button(
                onClick = { if (step == ChangeStep.ENTER_PHONE) sendVerificationCode() else verifyCode() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                enabled = (if (step == ChangeStep.ENTER_PHONE) isPhoneValid else isCodeValid) && !isLoading
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(24.dp))
                } else {
                    Text(if (step == ChangeStep.ENTER_PHONE) "Send Verification Code" else "Update Phone Number")
                }
            }
        }
    }
}

enum class ChangeStep {
    ENTER_PHONE,
    ENTER_OTP
}
