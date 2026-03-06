package com.solutioncrafts.BriskVTU.core.network

import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var request = chain.request()

        val currentUser = FirebaseAuth.getInstance().currentUser
        if (currentUser != null) {
            try {
                // Synchronously await the ID token
                val result = Tasks.await(currentUser.getIdToken(false))
                val token = result.token
                if (!token.isNullOrEmpty()) {
                    request = request.newBuilder()
                        .addHeader("Authorization", "Bearer $token")
                        .build()
                }
            } catch (e: Exception) {
                // Log exception if needed.
                // We'll proceed without the token and let the server return a 401 if it's protected.
                e.printStackTrace()
            }
        }

        return chain.proceed(request)
    }
}
