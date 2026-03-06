package com.solutioncrafts.BriskVTU.feature.auth

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthProvider
import com.solutioncrafts.BriskVTU.core.auth.UserSessionManager
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class VerificationUiState(
    val otpCode: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val verificationId: String = "",
    val routeDestination: String? = null
)

class VerificationViewModel : ViewModel() {
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
    private val _uiState = MutableStateFlow(VerificationUiState())
    val uiState: StateFlow<VerificationUiState> = _uiState.asStateFlow()

    fun setVerificationId(id: String) {
        _uiState.update { it.copy(verificationId = id) }
    }

    fun setOtpCode(code: String) {
        val digitsOnly = code.filter { it.isDigit() }
        _uiState.update { it.copy(otpCode = digitsOnly) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun resetRoute() {
        _uiState.update { it.copy(routeDestination = null) }
    }

    fun verifyCode() {
        val currentState = _uiState.value
        _uiState.update { it.copy(isLoading = true, error = null) }

        val credential = PhoneAuthProvider.getCredential(currentState.verificationId, currentState.otpCode)
        
        auth.signInWithCredential(credential)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    checkUserRecord()
                } else {
                    val ex = task.exception
                    Log.w("VerificationVM", "signInWithCredential failed", ex)
                    _uiState.update { it.copy(isLoading = false, error = ex?.localizedMessage ?: "Invalid code") }
                }
            }
    }

    private fun checkUserRecord() {
        viewModelScope.launch {
            try {
                val sessionManager = UserSessionManager.getInstance()
                // Wait for session manager to sync profile after Firebase Auth change
                val session = sessionManager.sessionState
                    .filter { it.isAuthenticated }
                    .first()
                
                if (session.profile != null) {
                    _uiState.update { it.copy(isLoading = false, routeDestination = "Home") }
                } else {
                    _uiState.update { it.copy(isLoading = false, routeDestination = "SetupProfile") }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = "Failed to connect to BriskVTU servers.") }
            }
        }
    }
}
