package com.solutioncrafts.BriskVTU.feature.transactions

import com.solutioncrafts.BriskVTU.core.models.Transaction
import kotlinx.serialization.Serializable
import retrofit2.http.GET

@Serializable
data class TransactionsResponse(
    val status: String,
    val data: List<Transaction>
)

interface TransactionApi {
    @GET("transactions")
    suspend fun getTransactions(): TransactionsResponse
}
