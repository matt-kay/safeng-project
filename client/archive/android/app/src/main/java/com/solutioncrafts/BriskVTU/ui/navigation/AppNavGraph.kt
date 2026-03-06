package com.solutioncrafts.BriskVTU.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.NavType
import androidx.navigation.navArgument
import com.solutioncrafts.BriskVTU.core.datastore.PreferencesManager
import com.solutioncrafts.BriskVTU.feature.auth.LoginScreen
import com.solutioncrafts.BriskVTU.feature.auth.VerificationScreen
import com.solutioncrafts.BriskVTU.feature.home.HomeScreen
import com.solutioncrafts.BriskVTU.feature.onboarding.OnboardingScreen
import com.solutioncrafts.BriskVTU.feature.profile.SetupProfileScreen
import com.solutioncrafts.BriskVTU.ui.screens.MainScreen
import kotlinx.coroutines.launch

sealed class Route(val route: String) {
    object Onboarding : Route("onboarding")
    object Login : Route("login")
    object Verification : Route("verification/{verificationId}") {
        fun createRoute(verificationId: String) = "verification/$verificationId"
    }
    object SetupProfile : Route("setup_profile")
    object Main : Route("main")
}

@Composable
fun AppNavGraph(
    navController: NavHostController = rememberNavController(),
    startDestination: String
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Route.Onboarding.route) {
            val context = LocalContext.current
            val scope = rememberCoroutineScope()
            // In a ViewModel architecture this should be injected. For now we use the Context instance.
            val prefs = PreferencesManager(context)
            OnboardingScreen(
                onComplete = {
                    scope.launch {
                        prefs.saveOnboardingCompleted()
                    }
                    navController.navigate(Route.Login.route) {
                        popUpTo(Route.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Route.Login.route) {
            LoginScreen(
                onNavigateToVerification = { verificationId ->
                    navController.navigate(Route.Verification.createRoute(verificationId))
                }
            )
        }
        composable(
            route = Route.Verification.route,
            arguments = listOf(navArgument("verificationId") { type = NavType.StringType })
        ) { backStackEntry ->
            val verificationId = backStackEntry.arguments?.getString("verificationId") ?: ""
            VerificationScreen(
                verificationId = verificationId,
                onNavigateToHome = {
                    navController.navigate(Route.Main.route) {
                        popUpTo(Route.Login.route) { inclusive = true }
                    }
                },
                onNavigateToSetupProfile = {
                    navController.navigate(Route.SetupProfile.route) {
                        popUpTo(Route.Login.route) { inclusive = true }
                    }
                },
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
        composable(Route.SetupProfile.route) {
            SetupProfileScreen(
                onNavigateToHome = {
                    navController.navigate(Route.Main.route) {
                        popUpTo(Route.SetupProfile.route) { inclusive = true }
                    }
                }
            )
        }
        composable(Route.Main.route) {
            MainScreen(
                onNavigateToLogin = {
                    navController.navigate(Route.Login.route) {
                        popUpTo(Route.Main.route) { inclusive = true }
                    }
                }
            )
        }
    }
}
