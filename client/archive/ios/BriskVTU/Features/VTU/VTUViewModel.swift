import Foundation
import SwiftUI
import Combine

@MainActor
final class VTUViewModel: ObservableObject {
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    @Published var variations: [VariationResponse] = []
    @Published var verifiedName: String?
    @Published var transactionResult: TransactionResponse?
    
    private let api = VTUAPI.shared
    
    func resetState() {
        errorMessage = nil
        verifiedName = nil
        transactionResult = nil
        variations = []
    }
    
    func fetchVariations(serviceId: String) async {
        isLoading = true
        errorMessage = nil
        variations = []
        
        do {
            let res = try await api.getVariations(serviceId: serviceId)
            self.variations = res
        } catch {
            self.errorMessage = error.localizedDescription
            print("Failed to fetch variations: \(error)")
        }
        
        isLoading = false
    }
    
    func verifyMerchant(billerCode: String, providerServiceId: String, serviceType: String) async {
        isLoading = true
        errorMessage = nil
        verifiedName = nil
        
        do {
            let req = VerifyMerchantRequest(billerCode: billerCode, providerServiceId: providerServiceId, serviceType: serviceType)
            let res = try await api.verifyMerchant(request: req)
            
            if let err = res.error {
                self.errorMessage = err
            } else if let name = res.Customer_Name {
                self.verifiedName = name
            } else {
                self.verifiedName = "Verified"
            }
        } catch {
            self.errorMessage = error.localizedDescription
            print("Failed to verify merchant: \(error)")
        }
        
        isLoading = false
    }
    
    func initiateTransaction(serviceType: String, serviceId: String, providerServiceId: String, amount: Double, variationCode: String? = nil) async {
        isLoading = true
        errorMessage = nil
        transactionResult = nil
        
        do {
            let req = InitiateTransactionRequest(
                serviceType: serviceType,
                serviceId: serviceId,
                providerServiceId: providerServiceId,
                amount: amount,
                variationCode: variationCode
            )
            let res = try await api.initiateTransaction(request: req)
            self.transactionResult = res
        } catch {
            self.errorMessage = error.localizedDescription
            print("Failed to initiate transaction: \(error)")
        }
        
        isLoading = false
    }
}
