import Foundation
import Combine

@MainActor
final class CouponViewModel: ObservableObject {
    @Published var myCoupons: [CouponResponse] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
    
    private let api = CouponAPI.shared
    
    func fetchMyCoupons() async {
        isLoading = true
        errorMessage = nil
        do {
            self.myCoupons = try await api.listMyCoupons()
        } catch {
            self.errorMessage = "Failed to load coupons."
            print("Fetch coupons error: \(error)")
        }
        isLoading = false
    }
    
    func createCoupon(amount: Int, maxUses: Int, name: String?, expiresAt: Date?) async {
        isLoading = true
        errorMessage = nil
        
        let formatter = ISO8601DateFormatter()
        let expiryStr = expiresAt.map { formatter.string(from: $0) }
        
        let request = CreateCouponRequest(
            amount_per_use: amount,
            max_uses: maxUses,
            currency: "NGN",
            name: name,
            expires_at: expiryStr,
            idempotency_key: UUID().uuidString
        )
        
        do {
            let _ = try await api.createCoupon(request: request)
            self.successMessage = "Coupon created successfully!"
            await fetchMyCoupons()
        } catch {
            self.errorMessage = "Failed to create coupon."
            print("Create coupon error: \(error)")
        }
        isLoading = false
    }
    
    func redeemCoupon(code: String) async {
        isLoading = true
        errorMessage = nil
        
        let request = RedeemCouponRequest(
            code: code,
            idempotency_key: UUID().uuidString
        )
        
        do {
            let res = try await api.redeemCoupon(request: request)
            self.successMessage = "Redeemed! ₦\(res.amount) added to your wallet."
        } catch {
            self.errorMessage = "Failed to redeem coupon. Please check the code."
            print("Redeem coupon error: \(error)")
        }
        isLoading = false
    }
    
    func pauseCoupon(id: String) async {
        do {
            try await api.pauseCoupon(id: id)
            await fetchMyCoupons()
        } catch {
            self.errorMessage = "Failed to pause coupon."
        }
    }
    
    func resumeCoupon(id: String) async {
        do {
            try await api.resumeCoupon(id: id)
            await fetchMyCoupons()
        } catch {
            self.errorMessage = "Failed to resume coupon."
        }
    }
    
    func revokeCoupon(id: String) async {
        do {
            try await api.revokeCoupon(id: id)
            await fetchMyCoupons()
        } catch {
            self.errorMessage = "Failed to revoke coupon."
        }
    }
    
    func clearMessages() {
        errorMessage = nil
        successMessage = nil
    }
}
