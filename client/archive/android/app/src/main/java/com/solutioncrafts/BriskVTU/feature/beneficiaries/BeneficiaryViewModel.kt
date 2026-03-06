package com.solutioncrafts.BriskVTU.feature.beneficiaries

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solutioncrafts.BriskVTU.network.APIClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class BeneficiaryViewModel : ViewModel() {
    private val api = APIClient.createService(BeneficiaryApi::class.java)

    private val _beneficiaries = MutableStateFlow<List<BeneficiaryResponse>>(emptyList())
    val beneficiaries: StateFlow<List<BeneficiaryResponse>> = _beneficiaries

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun fetchBeneficiaries() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val list = api.listBeneficiaries()
                _beneficiaries.value = list
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Failed to fetch beneficiaries"
                e.printStackTrace()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun addBeneficiary(request: CreateBeneficiaryRequest) {
        viewModelScope.launch {
            try {
                api.createBeneficiary(request)
                fetchBeneficiaries() // Refresh the list
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Failed to save beneficiary"
                e.printStackTrace()
            }
        }
    }

    fun updateBeneficiary(id: String, name: String? = null, isFavorite: Boolean? = null) {
        viewModelScope.launch {
            try {
                api.updateBeneficiary(id, UpdateBeneficiaryRequest(name, isFavorite))
                fetchBeneficiaries() // Refresh the list
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Failed to update beneficiary"
                e.printStackTrace()
            }
        }
    }

    fun deleteBeneficiary(id: String) {
        viewModelScope.launch {
            try {
                api.deleteBeneficiary(id)
                _beneficiaries.value = _beneficiaries.value.filter { it.id != id }
            } catch (e: Exception) {
                _error.value = e.localizedMessage ?: "Failed to delete beneficiary"
                e.printStackTrace()
            }
        }
    }
}
