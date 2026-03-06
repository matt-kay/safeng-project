import Foundation

struct BeneficiaryResponse: Codable, Identifiable {
    let id: String
    let userId: String
    let name: String
    let serviceType: String
    let providerServiceId: String
    let category: String
    let isFavorite: Bool
    let metadata: [String: String]?
    let lastUsedAt: String
    let createdAt: String
}

struct CreateBeneficiaryRequest: Codable {
    let name: String
    let serviceType: String
    let providerServiceId: String
    let category: String
    let metadata: [String: String]?
}

struct UpdateBeneficiaryRequest: Codable {
    let name: String?
    let isFavorite: Bool?
}


final class BeneficiaryAPI {
    static let shared = BeneficiaryAPI()
    private let client = APIClient.shared
    
    func listBeneficiaries() async throws -> [BeneficiaryResponse] {
        let res: BaseResponse<[BeneficiaryResponse]> = try await client.request(endpoint: "/beneficiaries", method: "GET")
        return res.data ?? []
    }
    
    func createBeneficiary(request: CreateBeneficiaryRequest) async throws -> BeneficiaryResponse {
        let data = try JSONEncoder().encode(request)
        let res: BaseResponse<BeneficiaryResponse> = try await client.request(endpoint: "/beneficiaries", method: "POST", body: data)
        guard let beneficiary = res.data else { throw APIError.noData }
        return beneficiary
    }
    
    func updateBeneficiary(id: String, request: UpdateBeneficiaryRequest) async throws -> BeneficiaryResponse {
        let data = try JSONEncoder().encode(request)
        let res: BaseResponse<BeneficiaryResponse> = try await client.request(endpoint: "/beneficiaries/\(id)", method: "PATCH", body: data)
        guard let beneficiary = res.data else { throw APIError.noData }
        return beneficiary
    }
    
    func deleteBeneficiary(id: String) async throws {
        let _: BaseResponse<EmptyResponse> = try await client.request(endpoint: "/beneficiaries/\(id)", method: "DELETE")
    }
}
