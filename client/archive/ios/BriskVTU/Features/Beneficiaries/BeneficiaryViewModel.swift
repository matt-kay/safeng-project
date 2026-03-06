import Foundation
import SwiftUI
import Combine

@MainActor
final class BeneficiaryViewModel: ObservableObject {
    @Published var beneficiaries: [BeneficiaryResponse] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let api = BeneficiaryAPI.shared
    
    func fetchBeneficiaries() async {
        isLoading = true
        errorMessage = nil
        do {
            self.beneficiaries = try await api.listBeneficiaries()
        } catch {
            self.errorMessage = "Failed to load beneficiaries."
            print("Fetch beneficiaries error: \(error)")
        }
        isLoading = false
    }
    
    func addBeneficiary(name: String, serviceType: String, providerServiceId: String, category: String, metadata: [String: String]? = nil) async {
        isLoading = true
        errorMessage = nil
        
        let request = CreateBeneficiaryRequest(
            name: name,
            serviceType: serviceType,
            providerServiceId: providerServiceId,
            category: category,
            metadata: metadata
        )
        
        do {
            _ = try await api.createBeneficiary(request: request)
            await fetchBeneficiaries()
        } catch {
            self.errorMessage = "Failed to save beneficiary."
            print("Create beneficiary error: \(error)")
        }
        isLoading = false
    }
    
    func updateBeneficiary(id: String, name: String? = nil, isFavorite: Bool? = nil) async {
        isLoading = true
        errorMessage = nil
        
        let request = UpdateBeneficiaryRequest(name: name, isFavorite: isFavorite)
        
        do {
            _ = try await api.updateBeneficiary(id: id, request: request)
            await fetchBeneficiaries()
        } catch {
            self.errorMessage = "Failed to update beneficiary."
            print("Update beneficiary error: \(error)")
        }
        isLoading = false
    }
    
    func deleteBeneficiary(id: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            try await api.deleteBeneficiary(id: id)
            self.beneficiaries.removeAll { $0.id == id }
        } catch {
            self.errorMessage = "Failed to delete beneficiary."
            print("Delete beneficiary error: \(error)")
        }
        isLoading = false
    }
}
