package com.solutioncrafts.BriskVTU.feature.vtu

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solutioncrafts.BriskVTU.core.network.APIClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class VTUUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val variations: List<VariationResponse> = emptyList(),
    val verifiedName: String? = null,
    val transactionResult: TransactionResponse? = null
)

class VTUViewModel : ViewModel() {
    private val vtuApi = APIClient.createService<VTUApi>()

    private val _uiState = MutableStateFlow(VTUUiState())
    val uiState: StateFlow<VTUUiState> = _uiState.asStateFlow()

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
    
    fun resetState() {
        _uiState.update { VTUUiState() }
    }

    fun fetchVariations(serviceId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, variations = emptyList()) }
            try {
                val res = vtuApi.getVariations(serviceId)
                _uiState.update { it.copy(isLoading = false, variations = res.data) }
            } catch (e: Exception) {
                Log.e("VTUViewModel", "Failed to fetch variations", e)
                _uiState.update { 
                    it.copy(
                        isLoading = false, 
                        error = e.localizedMessage ?: "Failed to fetch variations"
                    ) 
                }
            }
        }
    }

    fun verifyMerchant(billerCode: String, providerServiceId: String, serviceType: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, verifiedName = null) }
            try {
                val req = VerifyMerchantRequest(billerCode, providerServiceId, serviceType)
                val res = vtuApi.verifyMerchant(req)
                
                if (res.data.error != null) {
                    _uiState.update { it.copy(isLoading = false, error = res.data.error) }
                } else {
                    _uiState.update { it.copy(isLoading = false, verifiedName = res.data.Customer_Name ?: "Verified") }
                }
            } catch (e: Exception) {
                Log.e("VTUViewModel", "Failed to verify merchant", e)
                _uiState.update { 
                    it.copy(
                        isLoading = false, 
                        error = e.localizedMessage ?: "Failed to verify details"
                    ) 
                }
            }
        }
    }

    fun initiateTransaction(
        serviceType: String,
        serviceId: String,
        providerServiceId: String,
        amount: Double,
        variationCode: String? = null
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, transactionResult = null) }
            try {
                val req = InitiateTransactionRequest(serviceType, serviceId, providerServiceId, amount, variationCode)
                val res = vtuApi.initiateTransaction(req)
                _uiState.update { it.copy(isLoading = false, transactionResult = res.data) }
            } catch (e: Exception) {
                Log.e("VTUViewModel", "Failed to initiate transaction", e)
                _uiState.update { 
                    it.copy(
                        isLoading = false, 
                        error = e.localizedMessage ?: "Transaction failed"
                    ) 
                }
            }
        }
    }
}
