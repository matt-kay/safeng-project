package com.solutioncrafts.BriskVTU.feature.vtu

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

@Serializable
data class VariationResponse(
    val variation_code: String,
    val name: String,
    val variation_amount: String,
    val fixedPrice: String
)

@Serializable
data class VariationsApiResponse(
    val status: String,
    val data: List<VariationResponse>
)

@Serializable
data class VerifyMerchantRequest(
    val billerCode: String,
    val providerServiceId: String,
    val serviceType: String
)

@Serializable
data class VerifyMerchantApiResponse(
    val status: String,
    val data: VerifyMerchantContent
)

@Serializable
data class VerifyMerchantContent(
    val Customer_Name: String? = null,
    val Status: String? = null,
    val error: String? = null
)

@Serializable
data class InitiateTransactionRequest(
    val serviceType: String,
    val serviceId: String,
    val providerServiceId: String,
    val amount: Double,
    val variationCode: String? = null
)

@Serializable
data class TransactionResponse(
    val id: String,
    val category: String,
    val serviceType: String,
    val amount: Double,
    val status: String,
    val referenceId: String,
    val createdAt: String
)

@Serializable
data class InitiateTransactionApiResponse(
    val status: String,
    val message: String,
    val data: TransactionResponse
)


interface VTUApi {
    @GET("vtpass/variations/{serviceId}")
    suspend fun getVariations(
        @Path("serviceId") serviceId: String,
        @Query("forceRefresh") forceRefresh: Boolean = false
    ): VariationsApiResponse

    @POST("vtpass/verify")
    suspend fun verifyMerchant(@Body request: VerifyMerchantRequest): VerifyMerchantApiResponse

    @POST("transactions/initiate")
    suspend fun initiateTransaction(@Body request: InitiateTransactionRequest): InitiateTransactionApiResponse
}
