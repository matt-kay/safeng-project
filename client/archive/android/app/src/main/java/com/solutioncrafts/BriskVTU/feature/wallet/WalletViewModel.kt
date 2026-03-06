package com.solutioncrafts.BriskVTU.feature.wallet

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solutioncrafts.BriskVTU.core.network.APIClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class WalletUiState(
    val mainBalance: Double = 0.0,
    val cashbackBalance: Double = 0.0,
    val cards: List<PaymentCardResponse> = emptyList(),
    val isWalletEnabled: Boolean = true,
    val config: WalletConfigResponse? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

class WalletViewModel : ViewModel() {
    private val walletApi = APIClient.createService<WalletApi>()

    private val _uiState = MutableStateFlow(WalletUiState())
    val uiState: StateFlow<WalletUiState> = _uiState.asStateFlow()

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun fetchWallet() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val res = walletApi.getWallet()
                _uiState.update {
                    it.copy(
                        mainBalance = res.mainBalanceNgn,
                        cashbackBalance = res.cashbackBalanceNgn,
                        isWalletEnabled = true,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isWalletEnabled = false
                    )
                }
            }
        }
    }

    fun enableWallet() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val initRes = walletApi.initiateWallet()
                _uiState.update {
                    it.copy(
                        mainBalance = initRes.mainBalanceNgn,
                        cashbackBalance = initRes.cashbackBalanceNgn,
                        isWalletEnabled = true,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                Log.e("WalletViewModel", "Failed to init wallet", e)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.localizedMessage ?: "Failed to enable wallet"
                    )
                }
            }
        }
    }

    fun fetchConfig() {
        viewModelScope.launch {
            try {
                val config = walletApi.getConfig()
                _uiState.update { it.copy(config = config) }
            } catch (e: Exception) {
                Log.e("WalletViewModel", "Failed to fetch wallet config", e)
            }
        }
    }

    fun fetchCards() {
        viewModelScope.launch {
            try {
                val cards = walletApi.listCards()
                _uiState.update { it.copy(cards = cards) }
            } catch (e: Exception) {
                Log.e("WalletViewModel", "Failed to fetch cards", e)
            }
        }
    }

    fun removeCard(cardId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                walletApi.removeCard(cardId)
                fetchCards() // Refresh list
                _uiState.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                Log.e("WalletViewModel", "Failed to remove card", e)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.localizedMessage ?: "Failed to remove card"
                    )
                }
            }
        }
    }

    suspend fun initiateTopUp(amountUsd: Double, cardId: String?): TopUpResponse? {
        _uiState.update { it.copy(isLoading = true, error = null) }
        return try {
            val req = TopUpRequest(amountUsd, cardId)
            val res = walletApi.initiateTopUp(req)
            _uiState.update { it.copy(isLoading = false) }
            res
        } catch (e: Exception) {
            Log.e("WalletViewModel", "Failed to initiate top-up", e)
            _uiState.update {
                it.copy(
                    isLoading = false,
                    error = e.localizedMessage ?: "Failed to initiate top-up"
                )
            }
            null
        }
    }

    suspend fun getSetupIntentClientSecret(): String? {
        _uiState.update { it.copy(isLoading = true, error = null) }
        return try {
            val res = walletApi.createSetupIntent()
            _uiState.update { it.copy(isLoading = false) }
            res.clientSecret
        } catch (e: Exception) {
            Log.e("WalletViewModel", "Failed to create setup intent", e)
            _uiState.update {
                it.copy(
                    isLoading = false,
                    error = e.localizedMessage ?: "Failed to get setup intent"
                )
            }
            null
        }
    }

    fun attachCard(paymentMethodId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                walletApi.attachCard(AttachCardRequest(paymentMethodId))
                fetchCards() // refresh list
                _uiState.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                Log.e("WalletViewModel", "Failed to attach card", e)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.localizedMessage ?: "Failed to attach card"
                    )
                }
            }
        }
    }
}
