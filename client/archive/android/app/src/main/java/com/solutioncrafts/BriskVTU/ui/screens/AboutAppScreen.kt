package com.solutioncrafts.BriskVTU.ui.screens

import android.content.pm.PackageManager
import android.os.Build
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutAppScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val packageInfo = try {
        context.packageManager.getPackageInfo(context.packageName, 0)
    } catch (e: PackageManager.NameNotFoundException) {
        null
    }
    
    val versionString = packageInfo?.let {
        "Version ${it.versionName} (Build ${if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) it.longVersionCode else it.versionCode})"
    } ?: "Version Unknown"

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("About App", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 20.dp)
        ) {
            item {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Default.Info, // Placeholder for icon
                        contentDescription = "App Logo",
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "BriskVTU",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Maximize your Virtual Top-ups",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = versionString,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            item {
                Text(
                    text = "We Are Outspoken About Our Success and Position.",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Seamless Transactions, Exceptional Benefits, and Unmatched Convenience—All in One App!\n\nOur app is designed to make your life easier with seamless transactions, unbeatable convenience, and rewards at every step. Whether it’s airtime, data, utility bills, our app has got you covered with top-notch features and support.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))
            }

            item {
                Text(
                    text = "Our Core Services",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(12.dp))
                ServiceItem(
                    title = "Airtime & Data Top-Up",
                    description = "Stay connected with seamless airtime and data purchases. Whether it’s for MTN, Glo, Airtel, or 9mobile, BriskVTU ensures quick, secure, and affordable top-ups at competitive rates."
                )
                ServiceItem(
                    title = "Electricity Token Purchase",
                    description = "Buying electricity tokens has never been easier. Whether your family or business uses a prepaid or postpaid meter, BriskVTU makes it simple to keep the lights on."
                )
                ServiceItem(
                    title = "Cashback and Rewards",
                    description = "Enjoy cashback and rewards on every top-up and bill payment, adding value to your transactions."
                )
                ServiceItem(
                    title = "Cable TV Subscriptions",
                    description = "Renew your DSTV, GOTV, or Startimes subscriptions instantly. With BriskVTU, you don’t have to worry about missing your favorite TV shows, sports, or news updates."
                )
                ServiceItem(
                    title = "Expense Management",
                    description = "Keep an eye on your spending with detailed transaction history and analytics."
                )
                ServiceItem(
                    title = "24/7 Support",
                    description = "Get assistance anytime, anywhere with our dedicated support team available around the clock to help you resolve any issues quickly and efficiently."
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))
            }

            item {
                Text(
                    text = "Special Features",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(12.dp))
                ServiceItem(
                    title = "Coupons",
                    description = "Create and distribute utility coupons to multiple people at once. Perfect for birthdays, anniversaries, or simply helping out family and friends."
                )
                ServiceItem(
                    title = "Gifting",
                    description = "BriskVTU Gifting Feature allows users to send airtime, data, or services via gift codes. It ensures flexibility, control, and secure gifting within the app."
                )
                ServiceItem(
                    title = "Referral Program",
                    description = "BriskVTU rewards users for spreading the word! You get 5% cashback on their transactions for the first month, and they receive 5% cashback as a welcome bonus!"
                )
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

@Composable
fun ServiceItem(title: String, description: String) {
    Column(modifier = Modifier.padding(bottom = 16.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
