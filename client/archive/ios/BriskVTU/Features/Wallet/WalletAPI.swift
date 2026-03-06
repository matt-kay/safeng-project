import Foundation

enum WalletAPIError: Error {
    case invalidResponse
    case decodingFailed
}

struct WalletResponse: Codable {
    let mainBalanceNgn: Double
    let cashbackBalanceNgn: Double
}

struct WalletConfigResponse: Codable {
    let exchangeRate: Double
    let topUpFeePercentage: Double
}

struct PaymentCardResponse: Codable, Identifiable {
    let id: String
    let brand: String
    let last4: String
    let expMonth: Int
    let expYear: Int
    let isDefault: Bool
}

struct SetupIntentResponse: Codable {
    let clientSecret: String
}

struct TopUpResponse: Codable {
    let transactionId: String
    let clientSecret: String
    let amountUsd: Double
    let serviceFeeNgn: Double
    let exchangeRate: Double
}

struct TopUpRequest: Codable {
    let amountUsd: Double
    let cardId: String?
}

struct AttachCardRequest: Codable {
    let stripePaymentMethodId: String
}

final class WalletAPI {
    static let shared = WalletAPI()
    
    private let client = APIClient.shared
    
    func getWallet() async throws -> WalletResponse {
        let res: BaseResponse<WalletResponse> = try await client.request(endpoint: "/wallet", method: "GET")
        guard let wallet = res.data else { throw APIError.noData }
        return wallet
    }
    
    func getConfig() async throws -> WalletConfigResponse {
        let res: BaseResponse<WalletConfigResponse> = try await client.request(endpoint: "/wallet/config", method: "GET")
        guard let config = res.data else { throw APIError.noData }
        return config
    }
    
    func initiateWallet() async throws -> WalletResponse {
        let res: BaseResponse<WalletResponse> = try await client.request(endpoint: "/wallet/initiate", method: "POST")
        guard let wallet = res.data else { throw APIError.noData }
        return wallet
    }
    
    func listCards() async throws -> [PaymentCardResponse] {
        let res: BaseResponse<[PaymentCardResponse]> = try await client.request(endpoint: "/wallet/cards", method: "GET")
        return res.data ?? []
    }
    
    func createSetupIntent() async throws -> SetupIntentResponse {
        let res: BaseResponse<SetupIntentResponse> = try await client.request(endpoint: "/wallet/cards/setup-intent", method: "POST")
        guard let si = res.data else { throw APIError.noData }
        return si
    }
    
    func attachCard(paymentMethodId: String) async throws -> PaymentCardResponse {
        let req = AttachCardRequest(stripePaymentMethodId: paymentMethodId)
        let data = try JSONEncoder().encode(req)
        let res: BaseResponse<PaymentCardResponse> = try await client.request(endpoint: "/wallet/cards", method: "POST", body: data)
        guard let card = res.data else { throw APIError.noData }
        return card
    }
    
    func removeCard(cardId: String) async throws {
        let _: BaseResponse<EmptyResponse> = try await client.request(endpoint: "/wallet/cards/\(cardId)", method: "DELETE")
    }
    
    func initiateTopUp(amountUsd: Double, cardId: String?) async throws -> TopUpResponse {
        let req = TopUpRequest(amountUsd: amountUsd, cardId: cardId)
        let data = try JSONEncoder().encode(req)
        let res: BaseResponse<TopUpResponse> = try await client.request(endpoint: "/wallet/topup/initiate", method: "POST", body: data)
        guard let topUp = res.data else { throw APIError.noData }
        return topUp
    }
}
