package com.solutioncrafts.BriskVTU.feature.vtu

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReceiptScreen(
    status: String,
    serviceType: String,
    amount: Double,
    referenceId: String,
    createdAt: String,
    onDone: () -> Unit
) {
    val isSuccess = status == "SUCCESS"
    val isPending = status == "PENDING"
    
    val icon = if (isSuccess) Icons.Default.Check else Icons.Default.Warning
    val iconColor = if (isSuccess) Color(0xFF4CAF50) else if (isPending) Color(0xFFFFC107) else Color(0xFFF44336)

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Transaction Receipt") }
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(iconColor.copy(alpha = 0.2f), shape = CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = status,
                    tint = iconColor,
                    modifier = Modifier.size(48.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                text = "Transaction $status",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = iconColor
            )
            
            Spacer(modifier = Modifier.height(32.dp))

            ReceiptRow("Service", serviceType)
            ReceiptRow("Amount", "₦${"%,.2f".format(amount)}")
            ReceiptRow("Reference ID", referenceId)
            ReceiptRow("Date", createdAt)
            
            if (isPending) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Your transaction is pending provider confirmation. Your wallet will be refunded if it fails.",
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = onDone,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Done")
            }
        }
    }
}

@Composable
fun ReceiptRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, fontWeight = FontWeight.SemiBold)
    }
}
