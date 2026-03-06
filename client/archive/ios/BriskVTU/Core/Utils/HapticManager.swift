import SwiftUI

class HapticManager {
    static let shared = HapticManager()
    
    private init() {}
    
    func playImpact(style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        if UserDefaults.standard.bool(forKey: "isHapticEnabled") {
            let impact = UIImpactFeedbackGenerator(style: style)
            impact.impactOccurred()
        }
    }
    
    func playNotification(type: UINotificationFeedbackGenerator.FeedbackType = .success) {
        if UserDefaults.standard.bool(forKey: "isHapticEnabled") {
            let notification = UINotificationFeedbackGenerator()
            notification.notificationOccurred(type)
        }
    }
    
    func playSelection() {
        if UserDefaults.standard.bool(forKey: "isHapticEnabled") {
            let selection = UISelectionFeedbackGenerator()
            selection.selectionChanged()
        }
    }
}
