import SwiftUI

struct BeneficiariesView: View {
    @StateObject private var viewModel = BeneficiaryViewModel()
    @State private var searchText = ""
    
    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.beneficiaries.isEmpty {
                    ProgressView("Loading beneficiaries...")
                } else if let error = viewModel.errorMessage {
                    VStack {
                        Text(error)
                            .foregroundColor(.red)
                            .padding()
                        Button("Retry") {
                            Task { await viewModel.fetchBeneficiaries() }
                        }
                    }
                } else if viewModel.beneficiaries.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "person.crop.circle.badge.plus")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        Text("No Beneficiaries Saved")
                            .font(.headline)
                        Text("Save contacts during transactions to easily access them here.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                } else {
                    List {
                        ForEach(filteredBeneficiaries) { beneficiary in
                            BeneficiaryRow(beneficiary: beneficiary)
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        Task {
                                            await viewModel.deleteBeneficiary(id: beneficiary.id)
                                        }
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                                .swipeActions(edge: .leading) {
                                    Button {
                                        Task {
                                            await viewModel.updateBeneficiary(id: beneficiary.id, isFavorite: !beneficiary.isFavorite)
                                        }
                                    } label: {
                                        Label("Favorite", systemImage: beneficiary.isFavorite ? "star.slash" : "star.fill")
                                    }
                                    .tint(.yellow)
                                }
                        }
                    }
                    .searchable(text: $searchText, prompt: "Search Name or ID")
                }
            }
            .navigationTitle("Beneficiaries")
            .task {
                await viewModel.fetchBeneficiaries()
            }
        }
    }
    
    private var filteredBeneficiaries: [BeneficiaryResponse] {
        if searchText.isEmpty {
            return viewModel.beneficiaries
        } else {
            return viewModel.beneficiaries.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                $0.providerServiceId.contains(searchText)
            }
        }
    }
}

struct BeneficiaryRow: View {
    let beneficiary: BeneficiaryResponse
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(beneficiary.name)
                        .font(.headline)
                    if beneficiary.isFavorite {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                            .font(.caption)
                    }
                }
                Text("\(beneficiary.serviceType.capitalized) • \(beneficiary.providerServiceId)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    BeneficiariesView()
}
