import SwiftUI

struct VTUView: View {
    
    let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    LazyVGrid(columns: columns, spacing: 16) {
                        NavigationLink(destination: AirtimeView()) {
                            ServiceCard(title: "Airtime", iconName: "iphone", color: .blue)
                        }
                        
                        NavigationLink(destination: DataView()) {
                            ServiceCard(title: "Data", iconName: "wifi", color: .green)
                        }
                        
                        NavigationLink(destination: TVView()) {
                            ServiceCard(title: "TV", iconName: "tv", color: .orange)
                        }
                        
                        NavigationLink(destination: ElectricityView()) {
                            ServiceCard(title: "Electricity", iconName: "bolt", color: .yellow)
                        }
                    }
                    .padding(.horizontal)
                    
                    Spacer()
                }
                .padding(.top, 24)
            }
            .navigationTitle("VTpass Services")
            .background(Color(UIColor.systemGroupedBackground))
        }
    }
}

struct ServiceCard: View {
    let title: String
    let iconName: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: iconName)
                .font(.system(size: 32, weight: .medium))
                .foregroundColor(color)
            
            Text(title)
                .font(.headline)
                .foregroundColor(.primary)
        }
        .padding(.vertical, 24)
        .frame(maxWidth: .infinity)
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

#Preview {
    VTUView()
}
