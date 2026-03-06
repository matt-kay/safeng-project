package com.solutioncrafts.BriskVTU.feature.coupons

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solutioncrafts.BriskVTU.core.network.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

sealed class CouponUiState {
    object Idle : CouponUiState()
    object Loading : CouponUiState()
    data class Success(val message: String) : CouponUiState()
    data class Error(val message: String) : CouponUiState()
}

class CouponViewModel : ViewModel() {
    private val api = RetrofitClient.create<CouponApi>()

    private val _uiState = MutableStateFlow<CouponUiState>(CouponUiState.Idle)
    val uiState: StateFlow<CouponUiState> = _uiState.asStateFlow()

    private val _myCoupons = MutableStateFlow<List<CouponResponse>>(emptyList())
    val myCoupons: StateFlow<List<CouponResponse>> = _myCoupons.asStateFlow()

    fun fetchMyCoupons() {
        viewModelScope.launch {
            _uiState.value = CouponUiState.Loading
            try {
                val response = api.listMyCoupons()
                if (response.status == "success") {
                    _myCoupons.value = response.data ?: emptyList()
                    _uiState.value = CouponUiState.Idle
                } else {
                    _uiState.value = CouponUiState.Error(response.message ?: "Failed to fetch coupons")
                }
            } catch (e: Exception) {
                _uiState.value = CouponUiState.Error(e.message ?: "An error occurred")
            }
        }
    }

    fun createCoupon(amount: Int, maxUses: Int, name: String?, expiresAt: String?) {
        viewModelScope.launch {
            _uiState.value = CouponUiState.Loading
            try {
                val request = CreateCouponRequest(
                    amount_per_use = amount,
                    max_uses = maxUses,
                    name = name,
                    expires_at = expiresAt,
                    idempotency_key = UUID.randomUUID().toString()
                )
                val response = api.createCoupon(request)
                if (response.status == "success") {
                    _uiState.value = CouponUiState.Success("Coupon created successfully!")
                    fetchMyCoupons()
                } else {
                    _uiState.value = CouponUiState.Error(response.message ?: "Failed to create coupon")
                }
            } catch (e: Exception) {
                _uiState.value = CouponUiState.Error(e.message ?: "An error occurred")
            }
        }
    }

    fun redeemCoupon(code: String) {
        viewModelScope.launch {
            _uiState.value = CouponUiState.Loading
            try {
                val request = RedeemCouponRequest(
                    code = code,
                    idempotency_key = UUID.randomUUID().toString()
                )
                val response = api.redeemCoupon(request)
                if (response.status == "success") {
                    _uiState.value = CouponUiState.Success("Coupon redeemed successfully! ${response.data?.amount} NGN added to your wallet.")
                } else {
                    _uiState.value = CouponUiState.Error(response.message ?: "Failed to redeem coupon")
                }
            } catch (e: Exception) {
                _uiState.value = CouponUiState.Error(e.message ?: "An error occurred")
            }
        }
    }

    fun pauseCoupon(id: String) {
        viewModelScope.launch {
            try {
                api.pauseCoupon(id)
                fetchMyCoupons()
            } catch (e: Exception) {
                _uiState.value = CouponUiState.Error(e.message ?: "Failed to pause coupon")
            }
        }
    }

    fun resumeCoupon(id: String) {
        viewModelScope.launch {
            try {
                api.resumeCoupon(id)
                fetchMyCoupons()
            } catch (e: Exception) {
                _uiState.value = CouponUiState.Error(e.message ?: "Failed to resume coupon")
            }
        }
    }

    fun revokeCoupon(id: String) {
        viewModelScope.launch {
            try {
                api.revokeCoupon(id)
                fetchMyCoupons()
            } catch (e: Exception) {
                _uiState.value = CouponUiState.Error(e.message ?: "Failed to revoke coupon")
            }
        }
    }

    fun clearState() {
        _uiState.value = CouponUiState.Idle
    }
}
