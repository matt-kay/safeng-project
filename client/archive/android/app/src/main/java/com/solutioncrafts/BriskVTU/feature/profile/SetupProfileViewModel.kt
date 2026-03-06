package com.solutioncrafts.BriskVTU.feature.profile

import android.util.Patterns
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solutioncrafts.BriskVTU.core.auth.UserSessionManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SetupProfileUiState(
    val firstName: String = "",
    val lastName: String = "",
    val email: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isProfileSaved: Boolean = false
) {
    val isValid: Boolean
        get() = firstName.isNotBlank() && lastName.isNotBlank() && Patterns.EMAIL_ADDRESS.matcher(email).matches()
}

class SetupProfileViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(SetupProfileUiState())
    val uiState: StateFlow<SetupProfileUiState> = _uiState.asStateFlow()

    fun setFirstName(name: String) {
        _uiState.update { it.copy(firstName = name) }
    }

    fun setLastName(name: String) {
        _uiState.update { it.copy(lastName = name) }
    }

    fun setEmail(email: String) {
        _uiState.update { it.copy(email = email) }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun resetNavigation() {
        _uiState.update { it.copy(isProfileSaved = false) }
    }

    fun saveProfile() {
        if (!_uiState.value.isValid) return

        _uiState.update { it.copy(isLoading = true, error = null) }

        viewModelScope.launch {
            try {
                UserSessionManager.getInstance().createProfile(
                    firstName = _uiState.value.firstName,
                    lastName = _uiState.value.lastName,
                    email = _uiState.value.email
                )
                _uiState.update { it.copy(isLoading = false, isProfileSaved = true) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = "Failed to save profile. Try again.") }
            }
        }
    }
}
