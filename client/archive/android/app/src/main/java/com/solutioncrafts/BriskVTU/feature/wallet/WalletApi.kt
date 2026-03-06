package com.solutioncrafts.BriskVTU.feature.wallet

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

@Serializable
data class WalletResponse(
    val mainBalanceNgn: Double,
    val cashbackBalanceNgn: Double
)

@Serializable
data class WalletConfigResponse(
    val exchangeRate: Double,
    val topUpFeePercentage: Double
)

@Serializable
data class PaymentCardResponse(
    val id: String,
    val brand: String,
    val last4: String,
    val expMonth: Int,
    val expYear: Int,
    val isDefault: Boolean
)

@Serializable
data class SetupIntentResponse(
    val clientSecret: String
)

@Serializable
data class TopUpResponse(
    val transactionId: String,
    val clientSecret: String,
    val amountUsd: Double,
    val serviceFeeNgn: Double,
    val exchangeRate: Double
)

@Serializable
data class TopUpRequest(
    val amountUsd: Double,
    val cardId: String? = null
)

@Serializable
data class AttachCardRequest(
    val stripePaymentMethodId: String
)

interface WalletApi {
    @GET("wallet")
    suspend fun getWallet(): WalletResponse

    @GET("wallet/config")
    suspend fun getConfig(): WalletConfigResponse

    @POST("wallet/initiate")
    suspend fun initiateWallet(): WalletResponse

    @GET("wallet/cards")
    suspend fun listCards(): List<PaymentCardResponse>

    @POST("wallet/cards/setup-intent")
    suspend fun createSetupIntent(): SetupIntentResponse

    @POST("wallet/cards")
    suspend fun attachCard(@Body request: AttachCardRequest): PaymentCardResponse

    @DELETE("wallet/cards/{cardId}")
    suspend fun removeCard(@Path("cardId") cardId: String)

    @POST("wallet/topup/initiate")
    suspend fun initiateTopUp(@Body request: TopUpRequest): TopUpResponse
}
