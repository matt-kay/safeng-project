package com.solutioncrafts.BriskVTU.core.network

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.Authenticator
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route

class RevocationAuthenticator(
    private val onRevoked: () -> Unit
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        // If we got a 401, check if we've already retried (to prevent infinite loops)
        if (response.responseCount > 1) {
            return null
        }

        // Trigger the token revocation handler
        CoroutineScope(Dispatchers.Main).launch {
            onRevoked()
        }

        // We return null to fail the request since Auth needs to handle sign-out.
        return null
    }
    
    // Helper to get response count to prevent loop
    private val Response.responseCount: Int
        get() {
            var result = 1
            var priorResponse = priorResponse
            while (priorResponse != null) {
                result++
                priorResponse = priorResponse.priorResponse
            }
            return result
        }
}
