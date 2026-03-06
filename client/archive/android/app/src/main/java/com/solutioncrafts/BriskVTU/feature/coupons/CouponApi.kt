package com.solutioncrafts.BriskVTU.feature.coupons

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

@Serializable
data class CouponResponse(
    val id: String,
    val code: String,
    val name: String,
    val amountPerUse: Int,
    val maxUses: Int,
    val remainingUses: Int,
    val status: String,
    val currency: String,
    val expiresAt: String? = null,
    val createdAt: String,
    val creatorUserId: String
)

@Serializable
data class CouponRedemptionResponse(
    val id: String,
    val couponId: String,
    val redeemerUserId: String,
    val amount: Int,
    val status: String,
    val createdAt: String
)

@Serializable
data class CreateCouponRequest(
    val amount_per_use: Int,
    val max_uses: Int,
    val currency: String = "NGN",
    val name: String? = null,
    val expires_at: String? = null,
    val idempotency_key: String
)

@Serializable
data class RedeemCouponRequest(
    val code: String,
    val idempotency_key: String
)

@Serializable
data class UpdateCouponRequest(
    val name: String? = null,
    val expires_at: String? = null
)

@Serializable
data class BaseResponse<T>(
    val status: String,
    val data: T? = null,
    val message: String? = null
)

interface CouponApi {
    @POST("coupons")
    suspend fun createCoupon(@Body request: CreateCouponRequest): BaseResponse<CouponResponse>

    @POST("coupons/redeem")
    suspend fun redeemCoupon(@Body request: RedeemCouponRequest): BaseResponse<CouponRedemptionResponse>

    @GET("coupons")
    suspend fun listMyCoupons(): BaseResponse<List<CouponResponse>>

    @GET("coupons/{id}")
    suspend fun getCouponDetails(@Path("id") id: String): BaseResponse<CouponResponse>

    @PATCH("coupons/{id}")
    suspend fun updateCoupon(
        @Path("id") id: String,
        @Body request: UpdateCouponRequest
    ): BaseResponse<CouponResponse>

    @POST("coupons/{id}/pause")
    suspend fun pauseCoupon(@Path("id") id: String): BaseResponse<Unit>

    @POST("coupons/{id}/resume")
    suspend fun resumeCoupon(@Path("id") id: String): BaseResponse<Unit>

    @POST("coupons/{id}/revoke")
    suspend fun revokeCoupon(@Path("id") id: String): BaseResponse<Unit>
}
