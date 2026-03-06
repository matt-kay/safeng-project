package com.solutioncrafts.BriskVTU.feature.beneficiaries

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

@Serializable
data class BeneficiaryResponse(
    val id: String,
    val userId: String,
    val name: String,
    val serviceType: String,
    val providerServiceId: String,
    val category: String,
    val isFavorite: Boolean,
    val metadata: Map<String, String>? = null,
    val lastUsedAt: String,
    val createdAt: String
)

@Serializable
data class CreateBeneficiaryRequest(
    val name: String,
    val serviceType: String,
    val providerServiceId: String,
    val category: String,
    val metadata: Map<String, String>? = null
)

@Serializable
data class UpdateBeneficiaryRequest(
    val name: String? = null,
    val isFavorite: Boolean? = null
)

interface BeneficiaryApi {
    @GET("beneficiaries")
    suspend fun listBeneficiaries(): List<BeneficiaryResponse>

    @POST("beneficiaries")
    suspend fun createBeneficiary(@Body request: CreateBeneficiaryRequest): BeneficiaryResponse

    @PATCH("beneficiaries/{id}")
    suspend fun updateBeneficiary(
        @Path("id") id: String,
        @Body request: UpdateBeneficiaryRequest
    ): BeneficiaryResponse

    @DELETE("beneficiaries/{id}")
    suspend fun deleteBeneficiary(@Path("id") id: String)
}
