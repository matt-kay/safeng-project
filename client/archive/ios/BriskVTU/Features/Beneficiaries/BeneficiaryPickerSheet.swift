import SwiftUI

struct BeneficiaryPickerSheet: View {
    let serviceType: String
    @Binding var selectedBeneficiary: BeneficiaryResponse?
    @SwiftUI.Environment(\.dismiss) var dismiss
    @StateObject private var viewModel = BeneficiaryViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView("Loading beneficiaries...")
                } else if viewModel.errorMessage != nil {
                    VStack {
                        Text(viewModel.errorMessage!)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                            .padding()
                        Button("Retry") {
                            Task { await viewModel.fetchBeneficiaries() }
                        }
                    }
                } else if filteredBeneficiaries.isEmpty {
                    Text("No saved beneficiaries for this service.")
                        .foregroundColor(.secondary)
                } else {
                    List(filteredBeneficiaries) { beneficiary in
                        Button(action: {
                            selectedBeneficiary = beneficiary
                            dismiss()
                        }) {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(beneficiary.name)
                                        .font(.headline)
                                        .foregroundColor(.primary)
                                    Text("\(beneficiary.serviceType.capitalized) • \(beneficiary.providerServiceId)")
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.gray)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
            .navigationTitle("Select Beneficiary")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
            .task {
                await viewModel.fetchBeneficiaries()
            }
        }
    }
    
    private var filteredBeneficiaries: [BeneficiaryResponse] {
        viewModel.beneficiaries.filter { $0.serviceType == serviceType }
    }
}
