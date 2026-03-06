import Foundation

struct VariationResponse: Codable, Identifiable {
    var id: String { variation_code }
    let variation_code: String
    let name: String
    let variation_amount: String
    let fixedPrice: String
}

struct VerifyMerchantRequest: Codable {
    let billerCode: String
    let providerServiceId: String
    let serviceType: String
}

struct VerifyMerchantContent: Codable {
    let Customer_Name: String?
    let Status: String?
    let error: String?
}

struct InitiateTransactionRequest: Codable {
    let serviceType: String
    let serviceId: String
    let providerServiceId: String
    let amount: Double
    let variationCode: String?
}

struct TransactionResponse: Codable, Identifiable {
    let id: String
    let category: String
    let serviceType: String
    let amount: Double
    let status: String
    let referenceId: String
    let createdAt: String
}

final class VTUAPI {
    static let shared = VTUAPI()
    private let client = APIClient.shared
    
    func getVariations(serviceId: String) async throws -> [VariationResponse] {
        let res: BaseResponse<[VariationResponse]> = try await client.request(endpoint: "/vtpass/variations/\(serviceId)", method: "GET")
        return res.data ?? []
    }
    
    func verifyMerchant(request: VerifyMerchantRequest) async throws -> VerifyMerchantContent {
        let data = try JSONEncoder().encode(request)
        let res: BaseResponse<VerifyMerchantContent> = try await client.request(endpoint: "/vtpass/verify", method: "POST", body: data)
        guard let content = res.data else { throw APIError.noData }
        return content
    }
    
    func initiateTransaction(request: InitiateTransactionRequest) async throws -> TransactionResponse {
        let data = try JSONEncoder().encode(request)
        let res: BaseResponse<TransactionResponse> = try await client.request(endpoint: "/transactions/initiate", method: "POST", body: data)
        guard let transaction = res.data else { throw APIError.noData }
        return transaction
    }
}
