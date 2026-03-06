import SwiftUI

struct AirtimeView: View {
    @StateObject private var viewModel = VTUViewModel()
    @StateObject private var beneficiaryViewModel = BeneficiaryViewModel()
    
    @State private var phoneNumber: String = ""
    @State private var amount: String = ""
    @State private var selectedNetwork: String = "MTN"
    
    let networks = ["MTN", "Airtel", "Glo", "9mobile"]
    
    @State private var showCheckout = false
    @State private var showBeneficiaryPicker = false
    @State private var saveBeneficiary = false
    @State private var beneficiaryName = ""
    @SwiftUI.Environment(\.dismiss) var dismiss
    
    var body: some View {
        Form {
            Section(header: Text("Details")) {
                Picker("Network", selection: $selectedNetwork) {
                    ForEach(networks, id: \.self) { network in
                        Text(network).tag(network)
                    }
                }
                
                TextField("Phone Number", text: $phoneNumber)
                    .keyboardType(.phonePad)
                
                TextField("Amount (NGN)", text: $amount)
                    .keyboardType(.decimalPad)
            }
            
            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.footnote)
                    .padding(.horizontal)
            }
            
            Section {
                Toggle("Save as Beneficiary", isOn: $saveBeneficiary)
                if saveBeneficiary {
                    TextField("Beneficiary Name (e.g., Mom's MTN)", text: $beneficiaryName)
                }
            }

            Button(action: {
                showCheckout = true
            }) {
                HStack {
                    Spacer()
                    if viewModel.isLoading {
                        ProgressView()
                    } else {
                        Text("Proceed")
                            .fontWeight(.bold)
                    }
                    Spacer()
                }
            }
            .disabled(phoneNumber.isEmpty || amount.isEmpty || viewModel.isLoading)
        }
        .navigationTitle("Buy Airtime")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showBeneficiaryPicker = true }) {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .accessibilityLabel("Autofill Beneficiary")
                }
            }
        }
        .sheet(isPresented: $showCheckout) {
            CheckoutSheet(
                serviceName: "Airtime (\(selectedNetwork))",
                identifier: phoneNumber,
                amount: Double(amount) ?? 0.0,
                onConfirm: { pin in
                    showCheckout = false
                    
                    if saveBeneficiary && !beneficiaryName.isEmpty {
                        Task {
                            await beneficiaryViewModel.addBeneficiary(
                                name: beneficiaryName,
                                serviceType: "airtime",
                                providerServiceId: phoneNumber,
                                category: "mobile",
                                metadata: ["network": selectedNetwork]
                            )
                        }
                    }
                    
                    Task {
                        await viewModel.initiateTransaction(
                            serviceType: "airtime",
                            serviceId: selectedNetwork.lowercased(),
                            providerServiceId: phoneNumber,
                            amount: Double(amount) ?? 0.0
                        )
                    }
                },
                onDismiss: { showCheckout = false }
            )
        }
        .sheet(isPresented: $showBeneficiaryPicker) {
            BeneficiaryPickerSheet(serviceType: "airtime", selectedBeneficiary: Binding(
                get: { nil },
                set: { beneficiary in
                    if let beneficiary = beneficiary {
                        phoneNumber = beneficiary.providerServiceId
                        if let network = beneficiary.metadata?["network"] as? String {
                            selectedNetwork = network
                        }
                    }
                }
            ))
        }
        .fullScreenCover(item: $viewModel.transactionResult) { result in
            VTUReceiptView(
                status: result.status,
                serviceType: result.serviceType,
                amount: result.amount,
                referenceId: result.referenceId,
                createdAt: result.createdAt,
                onDone: {
                    viewModel.resetState()
                    dismiss()
                }
            )
        }
    }
}
