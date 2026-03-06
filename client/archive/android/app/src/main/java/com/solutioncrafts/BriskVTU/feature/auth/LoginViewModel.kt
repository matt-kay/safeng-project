package com.solutioncrafts.BriskVTU.feature.auth

import android.app.Activity
import android.util.Log
import androidx.lifecycle.ViewModel
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.concurrent.TimeUnit

data class LoginUiState(
    val phoneNumber: String = "",
    val countryCode: String = "+234",
    val isLoading: Boolean = false,
    val error: String? = null,
    val verificationId: String? = null
)

class LoginViewModel : ViewModel() {
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun setPhoneNumber(number: String) {
        // Simple numeric validation can go here
        val digitsOnly = number.filter { it.isDigit() }
        _uiState.update { it.copy(phoneNumber = digitsOnly) }
    }

    fun setCountryCode(code: String) {
        _uiState.update { it.copy(countryCode = code) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
    
    fun resetState() {
        _uiState.update { it.copy(verificationId = null, isLoading = false) }
    }

    fun verifyPhoneNumber(activity: Activity) {
        val currentState = _uiState.value
        val fullNumber = "${currentState.countryCode}${currentState.phoneNumber}"
        
        _uiState.update { it.copy(isLoading = true, error = null) }

        val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {

            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                // For Android, sometimes SMS verification is automatic.
                Log.d("LoginViewModel", "onVerificationCompleted: Auto-verification")
                // Usually handled automatically or bypasses OTP screen. 
                // For this architecture, we might wait for the user to proceed or handle auto signIn.
                _uiState.update { it.copy(isLoading = false) }
            }

            override fun onVerificationFailed(e: FirebaseException) {
                Log.w("LoginViewModel", "onVerificationFailed", e)
                _uiState.update { it.copy(isLoading = false, error = e.localizedMessage ?: "Verification failed") }
            }

            override fun onCodeSent(
                verificationId: String,
                token: PhoneAuthProvider.ForceResendingToken
            ) {
                Log.d("LoginViewModel", "onCodeSent:$verificationId")
                _uiState.update { it.copy(isLoading = false, verificationId = verificationId) }
            }
        }

        val options = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(fullNumber)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)
            .build()
        
        PhoneAuthProvider.verifyPhoneNumber(options)
    }
}
