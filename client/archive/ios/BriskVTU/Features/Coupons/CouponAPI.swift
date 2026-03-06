import Foundation

struct CouponResponse: Codable, Identifiable {
    let id: String
    let code: String
    let name: String
    let amountPerUse: Int
    let maxUses: Int
    let remainingUses: Int
    let status: String
    let currency: String
    let expiresAt: Date?
    let createdAt: Date
    let creatorUserId: String
}

struct CouponRedemptionResponse: Codable, Identifiable {
    let id: String
    let couponId: String
    let redeemerUserId: String
    let amount: Int
    let status: String
    let createdAt: Date
}

struct CreateCouponRequest: Codable {
    let amount_per_use: Int
    let max_uses: Int
    let currency: String
    let name: String?
    let expires_at: String?
    let idempotency_key: String
}

struct RedeemCouponRequest: Codable {
    let code: String
    let idempotency_key: String
}

struct UpdateCouponRequest: Codable {
    let name: String?
    let expires_at: String?
}

final class CouponAPI {
    static let shared = CouponAPI()
    private let client = APIClient.shared
    
    func createCoupon(request: CreateCouponRequest) async throws -> CouponResponse {
        let data = try JSONEncoder().encode(request)
        let res: BaseResponse<CouponResponse> = try await client.request(endpoint: "/coupons", method: "POST", body: data)
        guard let coupon = res.data else { throw APIError.noData }
        return coupon
    }
    
    func redeemCoupon(request: RedeemCouponRequest) async throws -> CouponRedemptionResponse {
        let data = try JSONEncoder().encode(request)
        let res: BaseResponse<CouponRedemptionResponse> = try await client.request(endpoint: "/coupons/redeem", method: "POST", body: data)
        guard let redemption = res.data else { throw APIError.noData }
        return redemption
    }
    
    func listMyCoupons() async throws -> [CouponResponse] {
        let res: BaseResponse<[CouponResponse]> = try await client.request(endpoint: "/coupons", method: "GET")
        return res.data ?? []
    }
    
    func pauseCoupon(id: String) async throws {
        let _: BaseResponse<EmptyResponse> = try await client.request(endpoint: "/coupons/\(id)/pause", method: "POST")
    }
    
    func resumeCoupon(id: String) async throws {
        let _: BaseResponse<EmptyResponse> = try await client.request(endpoint: "/coupons/\(id)/resume", method: "POST")
    }
    
    func revokeCoupon(id: String) async throws {
        let _: BaseResponse<EmptyResponse> = try await client.request(endpoint: "/coupons/\(id)/revoke", method: "POST")
    }
}
