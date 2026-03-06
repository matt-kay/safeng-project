import Foundation

struct UserProfile: Codable, Identifiable {
    let uid: String
    let email: String?
    let phoneNumber: String?
    let firstName: String?
    let lastName: String?
    let stripeCustomerId: String?
    let createdAt: Date?
    let updatedAt: Date?
    
    var id: String { uid }
    
    var avatarUrl: URL? {
        URL(string: "https://api.dicebear.com/7.x/avataaars/png?seed=\(uid)")
    }
    
    enum CodingKeys: String, CodingKey {
        case uid
        case email
        case phoneNumber = "phone_number"
        case firstName = "first_name"
        case lastName = "last_name"
        case stripeCustomerId = "stripe_customer_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
