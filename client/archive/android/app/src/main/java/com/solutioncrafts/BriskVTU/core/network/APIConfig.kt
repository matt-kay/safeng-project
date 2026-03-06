package com.solutioncrafts.BriskVTU.core.network

import com.solutioncrafts.BriskVTU.BuildConfig

object APIConfig {
    val BASE_URL: String
        get() = when (BuildConfig.BUILD_TYPE) {
            "debug" -> "http://10.0.2.2:3000/api/v1/" // Default Android Emulator localhost
            "staging" -> "https://staging.api.briskvtu.com/api/v1/"
            "release" -> "https://api.briskvtu.com/api/v1/"
            else -> "http://10.0.2.2:3000/api/v1/"
        }
}
