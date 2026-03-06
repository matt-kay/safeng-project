import SwiftUI

struct ElectricityView: View {
    @StateObject private var viewModel = VTUViewModel()
    @StateObject private var beneficiaryViewModel = BeneficiaryViewModel()
    
    @State private var meterNumber: String = ""
    @State private var amount: String = ""
    @State private var selectedBiller: String = "ikeja-electric"
    @State private var selectedMeterType: String = "prepaid"
    
    let billers = ["ikeja-electric", "eko-electric", "kano-electric", "port-harcourt-electric", "ibadan-electric", "abuja-electric", "enugu-electric", "benin-electric"]
    let meterTypes = ["prepaid", "postpaid"]
    
    @State private var showCheckout = false
    @State private var showBeneficiaryPicker = false
    @State private var verifyAndProceed = false
    @State private var saveBeneficiary = false
    @State private var beneficiaryName = ""
    @SwiftUI.Environment(\.dismiss) var dismiss
    
    var body: some View {
        Form {
            Section(header: Text("Details")) {
                Picker("Provider", selection: $selectedBiller) {
                    ForEach(billers, id: \.self) { biller in
                        Text(biller.replacingOccurrences(of: "-", with: " ").capitalized).tag(biller)
                    }
                }
                
                Picker("Meter Type", selection: $selectedMeterType) {
                    ForEach(meterTypes, id: \.self) { type in
                        Text(type.capitalized).tag(type)
                    }
                }
                
                TextField("Meter Number", text: $meterNumber)
                    .keyboardType(.numberPad)
                
                TextField("Amount (NGN)", text: $amount)
                    .keyboardType(.decimalPad)
            }
            
            if let error = viewModel.errorMessage {
                Text(error)
                    .foregroundColor(.red)
                    .font(.footnote)
                    .padding(.horizontal)
            }
            
            if let verifiedName = viewModel.verifiedName {
                HStack {
                    Text("Customer:")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(verifiedName)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                }
                .padding(.horizontal)
            }
            
            Section {
                Toggle("Save as Beneficiary", isOn: $saveBeneficiary)
                if saveBeneficiary {
                    TextField("Beneficiary Name (e.g., Home Prepaid)", text: $beneficiaryName)
                }
            }
            
            Button(action: {
                verifyAndProceed = true
                Task {
                    await viewModel.verifyMerchant(
                        billerCode: meterNumber,
                        providerServiceId: selectedBiller,
                        serviceType: selectedMeterType
                    )
                }
            }) {
                HStack {
                    Spacer()
                    if viewModel.isLoading {
                        ProgressView()
                    } else {
                        Text("Verify & Pay")
                            .fontWeight(.bold)
                    }
                    Spacer()
                }
            }
            .disabled(meterNumber.isEmpty || amount.isEmpty || viewModel.isLoading)
        }
        .navigationTitle("Electricity Bill")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: { showBeneficiaryPicker = true }) {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .accessibilityLabel("Autofill Beneficiary")
                }
            }
        }
        .onChange(of: viewModel.verifiedName) { name in
            if name != nil && verifyAndProceed {
                showCheckout = true
                verifyAndProceed = false
            }
        }
        .sheet(isPresented: $showCheckout) {
            CheckoutSheet(
                serviceName: "Electricity (\(selectedBiller.capitalized) - \(selectedMeterType.capitalized))",
                identifier: "\(meterNumber) (\(viewModel.verifiedName ?? ""))",
                amount: Double(amount) ?? 0.0,
                onConfirm: { pin in
                    showCheckout = false
                    
                    if saveBeneficiary && !beneficiaryName.isEmpty {
                        Task {
                            await beneficiaryViewModel.addBeneficiary(
                                name: beneficiaryName,
                                serviceType: "electricity-bill",
                                providerServiceId: meterNumber,
                                category: "electricity",
                                metadata: ["provider": selectedBiller, "meterType": selectedMeterType, "customerName": viewModel.verifiedName ?? ""]
                            )
                        }
                    }
                    
                    Task {
                        await viewModel.initiateTransaction(
                            serviceType: "electricity-bill",
                            serviceId: selectedBiller,
                            providerServiceId: meterNumber,
                            amount: Double(amount) ?? 0.0,
                            variationCode: selectedMeterType
                        )
                    }
                },
                onDismiss: { showCheckout = false }
            )
        }
        .sheet(isPresented: $showBeneficiaryPicker) {
            BeneficiaryPickerSheet(serviceType: "electricity-bill", selectedBeneficiary: Binding(
                get: { nil },
                set: { beneficiary in
                    if let beneficiary = beneficiary {
                        meterNumber = beneficiary.providerServiceId
                        if let provider = beneficiary.metadata?["provider"] as? String {
                            selectedBiller = provider
                        }
                        if let meterType = beneficiary.metadata?["meterType"] as? String {
                            selectedMeterType = meterType
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
