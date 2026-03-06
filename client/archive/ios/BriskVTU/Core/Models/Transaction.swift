import Foundation

enum TransactionType: String, Codable {
    case topUp = "TOP_UP"
    case payment = "PAYMENT"
    case cashback = "CASHBACK"
    case refund = "REFUND"
}

enum TransactionStatus: String, Codable {
    case initiated = "INITIATED"
    case pending = "PENDING"
    case success = "SUCCESS"
    case failed = "FAILED"
}

struct Transaction: Codable, Identifiable {
    let id: String
    let walletId: String
    let userId: String
    let type: TransactionType
    let amount: Int // in NGN Kobo
    let serviceFee: Int // in NGN Kobo
    let currency: String
    let status: TransactionStatus
    let exchangeRate: Double?
    let failureReason: String?
    let metadata: [String: AnyCodable]?
    let createdAt: Date
    let updatedAt: Date
    
    // Helper to format amount as currency
    var formattedAmount: String {
        let amountInNaira = Double(amount) / 100.0
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "NGN"
        formatter.currencySymbol = "₦"
        return formatter.string(from: NSNumber(value: amountInNaira)) ?? "₦\(String(format: "%.2f", amountInNaira))"
    }
}

// AnyCodable helper for heterogeneous dictionaries
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(Bool.self) {
            value = x
        } else if let x = try? container.decode(Int.self) {
            value = x
        } else if let x = try? container.decode(Double.self) {
            value = x
        } else if let x = try? container.decode(String.self) {
            value = x
        } else if let x = try? container.decode([String: AnyCodable].self) {
            value = x.mapValues { $0.value }
        } else if let x = try? container.decode([AnyCodable].self) {
            value = x.map { $0.value }
        } else {
            throw DecodingError.typeMismatch(AnyCodable.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for AnyCodable"))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        if let x = value as? Bool {
            try container.encode(x)
        } else if let x = value as? Int {
            try container.encode(x)
        } else if let x = value as? Double {
            try container.encode(x)
        } else if let x = value as? String {
            try container.encode(x)
        } else if let x = value as? [String: Any] {
            try container.encode(x.mapValues { AnyCodable($0) })
        } else if let x = value as? [Any] {
            try container.encode(x.map { AnyCodable($0) })
        } else {
            // Encode as empty if unknown
            try container.encodeNil()
        }
    }
}
