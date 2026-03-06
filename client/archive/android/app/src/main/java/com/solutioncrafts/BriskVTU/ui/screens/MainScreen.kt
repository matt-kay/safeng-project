package com.solutioncrafts.BriskVTU.ui.screens

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.solutioncrafts.BriskVTU.feature.home.HomeScreen
import com.solutioncrafts.BriskVTU.feature.profile.ProfileScreen
import com.solutioncrafts.BriskVTU.feature.vtu.VTUScreen
import com.solutioncrafts.BriskVTU.feature.wallet.WalletScreen

sealed class BottomNavItem(val route: String, val label: String, val icon: ImageVector) {
    object Home : BottomNavItem("home_tab", "Home", Icons.Default.Home)
    object Wallet : BottomNavItem("wallet_tab", "Wallet", Icons.Default.Wallet)
    object VTU : BottomNavItem("vtu_tab", "VTU", Icons.Default.ShoppingCart) // Placeholder for VTU icon
    object Menu : BottomNavItem("menu_tab", "Menu", Icons.Default.Menu)
}

@Composable
fun MainScreen(
    onNavigateToLogin: () -> Unit
) {
    val navController = rememberNavController()
    val items = listOf(
        BottomNavItem.Home,
        BottomNavItem.Wallet,
        BottomNavItem.VTU,
        BottomNavItem.Menu
    )

    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                items.forEach { item ->
                    NavigationBarItem(
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                        selected = currentDestination?.hierarchy?.any { it.route == item.route } == true,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = BottomNavItem.Home.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(BottomNavItem.Home.route) {
                HomeScreen(
                    onNavigateToLogin = onNavigateToLogin
                )
            }
            composable(BottomNavItem.Wallet.route) {
                WalletScreen()
            }
            composable(BottomNavItem.VTU.route) {
                VTUScreen(
                    onNavigateToAirtime = { navController.navigate("vtu_airtime") },
                    onNavigateToData = { navController.navigate("vtu_data") },
                    onNavigateToTV = { navController.navigate("vtu_tv") },
                    onNavigateToElectricity = { navController.navigate("vtu_electricity") }
                )
            }
            composable("vtu_airtime") {
                com.solutioncrafts.BriskVTU.feature.vtu.AirtimeScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable("vtu_data") {
                com.solutioncrafts.BriskVTU.feature.vtu.DataScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable("vtu_tv") {
                com.solutioncrafts.BriskVTU.feature.vtu.TVScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable("vtu_electricity") {
                com.solutioncrafts.BriskVTU.feature.vtu.ElectricityScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable(BottomNavItem.Menu.route) {
                MenuScreen(
                    onNavigateToProfileEdit = { navController.navigate("profile_edit") },
                    onNavigateToChangePhoneNumber = { navController.navigate("change_phone_number") },
                    onNavigateToBeneficiaries = { navController.navigate("beneficiaries") },
                    onNavigateToCoupons = { navController.navigate("coupons") },
                    onNavigateToTransactions = { navController.navigate("transactions") },
                    onNavigateToAboutApp = { navController.navigate("about_app") },
                    onNavigateToContactUs = { navController.navigate("contact_us") },
                    onLogout = {
                        FirebaseAuth.getInstance().signOut()
                        onNavigateToLogin()
                    }
                )
            }
            composable("profile_edit") {
                com.solutioncrafts.BriskVTU.ui.screens.profile.ProfileEditScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable("change_phone_number") {
                com.solutioncrafts.BriskVTU.ui.screens.ChangePhoneNumberScreen(
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable("beneficiaries") {
                com.solutioncrafts.BriskVTU.feature.beneficiaries.BeneficiariesScreen()
            }
            composable("coupons") {
                com.solutioncrafts.BriskVTU.feature.coupons.CouponsScreen()
            }
            composable("transactions") {
                com.solutioncrafts.BriskVTU.feature.transactions.TransactionsScreen()
            }
            composable("about_app") {
                AboutAppScreen(onNavigateBack = { navController.popBackStack() })
            }
            composable("contact_us") {
                ContactUsScreen(onNavigateBack = { navController.popBackStack() })
            }
        }
    }
}
