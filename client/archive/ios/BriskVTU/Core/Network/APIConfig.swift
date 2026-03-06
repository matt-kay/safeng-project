import Foundation

enum AppEnvironment {
    case dev
    case staging
    case prod
}

struct APIConfig {
    static let shared = APIConfig()
    
    // Set your active environment here
    var activeEnvironment: AppEnvironment = .dev
    
    var baseURL: URL {
        switch activeEnvironment {
        case .dev:
            // For iOS Simulator localhost is fine. For physical devices, use your Mac's IP.
            return URL(string: "http://localhost:3000/api/v1")!
        case .staging:
            return URL(string: "https://staging.api.briskvtu.com/api/v1")!
        case .prod:
            return URL(string: "https://api.briskvtu.com/api/v1")!
        }
    }
}
