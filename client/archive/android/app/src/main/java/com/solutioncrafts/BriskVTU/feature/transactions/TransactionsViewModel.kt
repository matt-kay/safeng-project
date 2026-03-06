package com.solutioncrafts.BriskVTU.feature.transactions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solutioncrafts.BriskVTU.core.models.Transaction
import com.solutioncrafts.BriskVTU.core.network.APIClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class TransactionsUiState {
    object Loading : TransactionsUiState()
    data class Success(val transactions: List<Transaction>) : TransactionsUiState()
    data class Error(val message: String) : TransactionsUiState()
}

class TransactionsViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<TransactionsUiState>(TransactionsUiState.Loading)
    val uiState = _uiState.asStateFlow()

    private val api = APIClient.createService<TransactionApi>()

    init {
        fetchTransactions()
    }

    fun fetchTransactions() {
        viewModelScope.launch {
            _uiState.value = TransactionsUiState.Loading
            try {
                val response = api.getTransactions()
                _uiState.value = TransactionsUiState.Success(response.data.sortedByDescending { it.createdAt })
            } catch (e: Exception) {
                _uiState.value = TransactionsUiState.Error(e.message ?: "Unknown error occurred")
            }
        }
    }
}
