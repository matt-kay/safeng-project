package com.solutioncrafts.BriskVTU.core.auth

import com.google.firebase.auth.FirebaseAuth
import com.solutioncrafts.BriskVTU.core.models.UserProfile
import com.solutioncrafts.BriskVTU.core.network.APIClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST

// Retrofit interface for Auth Service sync
interface AuthApiService {
    @GET("me/profile")
    suspend fun getProfile(): UserProfile

    @POST("me/profile")
    suspend fun createProfile(@Body profile: UserProfileRequest): UserProfile

    @PATCH("me/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): UserProfile
}

@Serializable
data class UserProfileRequest(
    @SerialName("first_name") val firstName: String,
    @SerialName("last_name") val lastName: String,
    val email: String,
    @SerialName("phone_number") val phoneNumber: String
)

@Serializable
data class UpdateProfileRequest(
    @SerialName("phone_number") val phoneNumber: String? = null,
    @SerialName("first_name") val firstName: String? = null,
    @SerialName("last_name") val lastName: String? = null,
    val email: String? = null
)

data class UserSession(
    val isAuthenticated: Boolean = false,
    val profile: UserProfile? = null
)

class UserSessionManager private constructor() {

    private val authScope = CoroutineScope(Dispatchers.IO)
    private val authApiService = APIClient.createService<AuthApiService>()

    private val _sessionState = MutableStateFlow(UserSession())
    val sessionState: StateFlow<UserSession> = _sessionState.asStateFlow()

    init {
        // Wire up network revocation handler
        APIClient.onUnauthorized = {
            handleTokenRevocation()
        }

        // Listen for Firebase Auth changes
        FirebaseAuth.getInstance().addAuthStateListener { auth ->
            if (auth.currentUser != null) {
                // User signed in
                _sessionState.value = _sessionState.value.copy(isAuthenticated = true)
                authScope.launch { syncProfile() }
            } else {
                // User signed out
                clearSession()
            }
        }
    }

    private suspend fun syncProfile() {
        try {
            val profile = authApiService.getProfile()
            _sessionState.value = _sessionState.value.copy(profile = profile)
            // Optionally save to DataStore/EncryptedSharedPreferences here
        } catch (e: retrofit2.HttpException) {
            if (e.code() == 404) {
                // Profile not found, but authenticated
                _sessionState.value = _sessionState.value.copy(profile = null)
            } else {
                e.printStackTrace()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            // Error loading profile, fallback to cached or handle error
        }
    }

    suspend fun createProfile(firstName: String, lastName: String, email: String) {
        val currentUser = FirebaseAuth.getInstance().currentUser ?: return
        val request = UserProfileRequest(
            firstName = firstName,
            lastName = lastName,
            email = email,
            phoneNumber = currentUser.phoneNumber ?: ""
        )
        try {
            val profile = authApiService.createProfile(request)
            _sessionState.value = _sessionState.value.copy(profile = profile)
        } catch (e: Exception) {
            e.printStackTrace()
            throw e
        }
    }

    suspend fun updatePhoneNumber(newPhoneNumber: String) {
        val request = UpdateProfileRequest(phoneNumber = newPhoneNumber)
        try {
            val profile = authApiService.updateProfile(request)
            _sessionState.value = _sessionState.value.copy(profile = profile)
        } catch (e: Exception) {
            e.printStackTrace()
            throw e
        }
    }

    private fun handleTokenRevocation() {
        try {
            FirebaseAuth.getInstance().signOut()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        clearSession()
    }

    private fun clearSession() {
        _sessionState.value = UserSession(isAuthenticated = false, profile = null)
        // Optionally clear DataStore cache here
    }

    companion object {
        @Volatile
        private var INSTANCE: UserSessionManager? = null

        fun getInstance(): UserSessionManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: UserSessionManager().also { INSTANCE = it }
            }
        }
    }
}
