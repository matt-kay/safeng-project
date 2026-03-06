package com.solutioncrafts.BriskVTU.core.network

import retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

object APIClient {

    private val json = Json { ignoreUnknownKeys = true }

    // Inject Revocation handler dynamically from the Auth layer
    var onUnauthorized: (() -> Unit)? = null

    val retrofit: Retrofit by lazy {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val authenticator = RevocationAuthenticator {
            onUnauthorized?.invoke()
        }

        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor(AuthInterceptor())
            .authenticator(authenticator)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
            
        val contentType = "application/json".toMediaType()

        Retrofit.Builder()
            .baseUrl(APIConfig.BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()
    }
    
    // Create an API Service
    inline fun <reified T> createService(): T {
        return retrofit.create(T::class.java)
    }
}
