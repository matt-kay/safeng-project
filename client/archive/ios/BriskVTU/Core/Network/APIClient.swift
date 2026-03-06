import Foundation
import FirebaseAuth

enum APIError: Error {
    case invalidURL
    case noData
    case unauthorized
    case serverError(statusCode: Int, payload: Data?)
    case decodingError(Error)
    case unknown(Error)
}

struct BaseResponse<T: Codable>: Codable {
    let status: String
    let data: T?
    let message: String?
}

struct EmptyResponse: Codable {}

final class APIClient {
    static let shared = APIClient()
    
    private let session: URLSession
    
    // We will inject the revocation handler here from UserSessionManager
    // to avoid import or circular dependency issues if needed, or we can use NotificationCenter.
    var onUnauthorized: (() -> Void)?
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        self.session = URLSession(configuration: config)
    }
    
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        
        let baseURL = APIConfig.shared.baseURL
        var urlComponents = URLComponents(url: baseURL.appendingPathComponent(endpoint), resolvingAgainstBaseURL: true)
        
        if let queryItems = queryItems {
            urlComponents?.queryItems = queryItems
        }
        
        guard let url = urlComponents?.url else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        // Asynchronously fetch Firebase Token and Inject
        if let currentUser = Auth.auth().currentUser {
            do {
                let token = try await currentUser.getIDToken()
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            } catch {
                print("Failed to get Firebase ID Token: \(error)")
                // We might still proceed without a token or throw. Usually best to throw if it's strictly protected,
                // but we let the server respond with 401.
            }
        }
        
        if let body = body {
            request.httpBody = body
        }
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.noData
            }
            
            switch httpResponse.statusCode {
            case 200...299:
                do {
                    let decoder = JSONDecoder()
                    decoder.dateDecodingStrategy = .iso8601 // Adjust if server uses different date format
                    return try decoder.decode(T.self, from: data)
                } catch {
                    throw APIError.decodingError(error)
                }
            case 401:
                // Handle Revocation centrally
                await handleUnauthorized()
                throw APIError.unauthorized
            default:
                throw APIError.serverError(statusCode: httpResponse.statusCode, payload: data)
            }
            
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.unknown(error)
        }
    }
    
    private func handleUnauthorized() async {
        // Trigger revocation handler
        // Usually called on main thread because it updates UI state
        await MainActor.run {
            self.onUnauthorized?()
        }
    }
}
