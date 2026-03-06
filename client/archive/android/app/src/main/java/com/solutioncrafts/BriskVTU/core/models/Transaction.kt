package com.solutioncrafts.BriskVTU.core.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
enum class TransactionType {
    @SerialName("TOP_UP") TOP_UP,
    @SerialName("PAYMENT") PAYMENT,
    @SerialName("CASHBACK") CASHBACK,
    @SerialName("REFUND") REFUND
}

@Serializable
enum class TransactionStatus {
    @SerialName("INITIATED") INITIATED,
    @SerialName("PENDING") PENDING,
    @SerialName("SUCCESS") SUCCESS,
    @SerialName("FAILED") FAILED
}

@Serializable
data class Transaction(
    val id: String,
    @SerialName("walletId") val walletId: String,
    @SerialName("userId") val userId: String,
    val type: TransactionType,
    val amount: Long, // in NGN Kobo
    val serviceFee: Long, // in NGN Kobo
    val currency: String = "NGN",
    val status: TransactionStatus,
    val exchangeRate: Double? = null,
    val failureReason: String? = null,
    val metadata: Map<String, JsonElement>? = null,
    @SerialName("createdAt") val createdAt: String,
    @SerialName("updatedAt") val updatedAt: String
) {
    val formattedAmount: String
        get() = "₦${String.format("%.2f", amount / 100.0)}"
        
    val formattedFee: String
        get() = "₦${String.format("%.2f", serviceFee / 100.0)}"
}
