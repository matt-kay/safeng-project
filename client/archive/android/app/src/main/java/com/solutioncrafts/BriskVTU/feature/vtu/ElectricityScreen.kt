package com.solutioncrafts.BriskVTU.feature.vtu

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.solutioncrafts.BriskVTU.feature.beneficiaries.BeneficiaryPickerBottomSheet
import com.solutioncrafts.BriskVTU.feature.beneficiaries.BeneficiaryViewModel
import com.solutioncrafts.BriskVTU.feature.beneficiaries.CreateBeneficiaryRequest
import androidx.compose.material.icons.filled.ContactPage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ElectricityScreen(
    onNavigateBack: () -> Unit,
    viewModel: VTUViewModel = viewModel(),
    beneficiaryViewModel: BeneficiaryViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    var meterNumber by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var selectedBiller by remember { mutableStateOf("ikeja-electric") }
    var selectedMeterType by remember { mutableStateOf("prepaid") }

    var showCheckout by remember { mutableStateOf(false) }
    var showBeneficiaryPicker by remember { mutableStateOf(false) }
    
    var saveBeneficiary by remember { mutableStateOf(false) }
    var beneficiaryName by remember { mutableStateOf("") }

    if (uiState.transactionResult != null) {
        ReceiptScreen(
            status = uiState.transactionResult!!.status,
            serviceType = uiState.transactionResult!!.serviceType,
            amount = uiState.transactionResult!!.amount,
            referenceId = uiState.transactionResult!!.referenceId,
            createdAt = uiState.transactionResult!!.createdAt,
            onDone = { 
                viewModel.resetState()
                onNavigateBack()
            }
        )
        return
    }

    var proceedTapped by remember { mutableStateOf(false) }
    
    LaunchedEffect(uiState.verifiedName, uiState.error) {
        if (proceedTapped) {
            if (uiState.verifiedName != null) {
                showCheckout = true
                proceedTapped = false
            } else if (uiState.error != null) {
                proceedTapped = false
            }
        }
    }

    if (showCheckout) {
        CheckoutDialog(
            serviceName = "Electricity ($selectedBiller - $selectedMeterType)",
            identifier = "$meterNumber (${uiState.verifiedName})",
            amount = amount.toDoubleOrNull() ?: 0.0,
            onConfirm = { pin ->
                showCheckout = false
                
                if (saveBeneficiary && beneficiaryName.isNotBlank()) {
                    beneficiaryViewModel.addBeneficiary(
                        CreateBeneficiaryRequest(
                            name = beneficiaryName,
                            serviceType = "electricity-bill",
                            providerServiceId = meterNumber,
                            category = "electricity",
                            metadata = mapOf("provider" to selectedBiller, "meterType" to selectedMeterType, "customerName" to (uiState.verifiedName ?: ""))
                        )
                    )
                }
                
                viewModel.initiateTransaction(
                    serviceType = "electricity-bill",
                    serviceId = selectedBiller,
                    providerServiceId = meterNumber,
                    amount = amount.toDoubleOrNull() ?: 0.0,
                    variationCode = selectedMeterType
                )
            },
            onDismiss = { showCheckout = false }
        )
    }

    if (showBeneficiaryPicker) {
        BeneficiaryPickerBottomSheet(
            serviceType = "electricity-bill",
            onDismiss = { showBeneficiaryPicker = false },
            onSelect = { beneficiary ->
                meterNumber = beneficiary.providerServiceId
                beneficiary.metadata?.get("provider")?.let { selectedBiller = it }
                beneficiary.metadata?.get("meterType")?.let { selectedMeterType = it }
                showBeneficiaryPicker = false
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Electricity Bill") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showBeneficiaryPicker = true }) {
                        Icon(Icons.Default.ContactPage, contentDescription = "Autofill Beneficiary")
                    }
                }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (uiState.error != null) {
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            var expandedBiller by remember { mutableStateOf(false) }
            val billers = listOf("ikeja-electric", "eko-electric", "kano-electric", "port-harcourt-electric", "ibadan-electric", "abuja-electric", "enugu-electric", "benin-electric")
            
            ExposedDropdownMenuBox(
                expanded = expandedBiller,
                onExpandedChange = { expandedBiller = !expandedBiller }
            ) {
                OutlinedTextField(
                    value = selectedBiller,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Provider") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedBiller) },
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(
                    expanded = expandedBiller,
                    onDismissRequest = { expandedBiller = false }
                ) {
                    billers.forEach { b ->
                        DropdownMenuItem(
                            text = { Text(b) },
                            onClick = {
                                selectedBiller = b
                                expandedBiller = false
                            }
                        )
                    }
                }
            }
            
            var expandedType by remember { mutableStateOf(false) }
            val types = listOf("prepaid", "postpaid")
            
             ExposedDropdownMenuBox(
                expanded = expandedType,
                onExpandedChange = { expandedType = !expandedType }
            ) {
                OutlinedTextField(
                    value = selectedMeterType.replaceFirstChar { it.uppercase() },
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Meter Type") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedType) },
                    modifier = Modifier.menuAnchor().fillMaxWidth()
                )
                ExposedDropdownMenu(
                    expanded = expandedType,
                    onDismissRequest = { expandedType = false }
                ) {
                    types.forEach { t ->
                        DropdownMenuItem(
                            text = { Text(t.replaceFirstChar { it.uppercase() }) },
                            onClick = {
                                selectedMeterType = t
                                expandedType = false
                            }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = meterNumber,
                onValueChange = { meterNumber = it },
                label = { Text("Meter Number") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )
            
            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                label = { Text("Amount (NGN)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )

            if (uiState.verifiedName != null && !proceedTapped) {
                Text(
                    text = "Customer: ${uiState.verifiedName}",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                Checkbox(checked = saveBeneficiary, onCheckedChange = { saveBeneficiary = it })
                Text("Save as Beneficiary")
            }
            
            if (saveBeneficiary) {
                OutlinedTextField(
                    value = beneficiaryName,
                    onValueChange = { beneficiaryName = it },
                    label = { Text("Beneficiary Name (e.g., Home Prepaid)") },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            Button(
                onClick = {
                    proceedTapped = true
                    viewModel.verifyMerchant(
                        billerCode = meterNumber,
                        providerServiceId = selectedBiller,
                        serviceType = selectedMeterType // vtpass uses prepai/postpaid here in some docs, wait. We'll pass selectedBiller for now, or selectedMeterType for serviceType. Wait! Electricity verify uses `type: prepaid/postpaid`.
                    )
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = meterNumber.isNotBlank() && amount.isNotBlank() && !uiState.isLoading
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text("Verify & Pay")
                }
            }
        }
    }
}
