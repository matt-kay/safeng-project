import SwiftUI

struct ContactUsView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "envelope.fill")
                        .font(.system(size: 50))
                        .foregroundStyle(.orange)
                        .padding(.bottom, 8)
                    
                    Text("Get In Touch")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Text("Our dedicated support team is available around the clock to help you resolve any issues quickly and efficiently.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 24)
                
                // Contact Details
                VStack(spacing: 16) {
                    ContactRow(
                        icon: "phone.fill",
                        title: "Phone (US)",
                        detail: "+1 (351) 218-3397",
                        link: "tel://+13512183397"
                    )
                    
                    ContactRow(
                        icon: "phone.fill",
                        title: "Phone (US Secondary)",
                        detail: "+1 (781) 888-5782",
                        link: "tel://+17818885782"
                    )
                    
                    ContactRow(
                        icon: "envelope.fill",
                        title: "Email",
                        detail: "hello@briskvtu.com",
                        link: "mailto:hello@briskvtu.com"
                    )
                    
                    ContactRow(
                        icon: "mappin.and.ellipse",
                        title: "Address (US)",
                        detail: "160, Alewife Brook Pkwy #1192, Cambridge, MA 02138",
                        link: "http://maps.apple.com/?q=160,Alewife+Brook+Pkwy+1192,Cambridge,MA+02138"
                    )
                    
                    ContactRow(
                        icon: "mappin.and.ellipse",
                        title: "Address (Nigeria)",
                        detail: "Plot 607 Toyin Omotosho Cresent, Omole Phase 2, Ikeja, Lagos",
                        link: "http://maps.apple.com/?q=Plot+607+Toyin+Omotosho+Cresent,Omole+Phase+2,Ikeja,Lagos"
                    )
                }
                .padding(.horizontal, 20)
                
                Spacer(minLength: 40)
            }
        }
        .navigationTitle("Contact Us")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct ContactRow: View {
    let icon: String
    let title: String
    let detail: String
    let link: String
    
    var body: some View {
        if let url = URL(string: link) {
            Link(destination: url) {
                rowContent
            }
            .buttonStyle(.plain)
        } else {
            rowContent
        }
    }
    
    private var rowContent: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color.orange.opacity(0.1))
                    .frame(width: 44, height: 44)
                
                Image(systemName: icon)
                    .foregroundStyle(.orange)
                    .font(.system(size: 20))
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                
                Text(detail)
                    .font(.body)
                    .foregroundStyle(.primary)
                    .multilineTextAlignment(.leading)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(Color(uiColor: .secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    NavigationStack {
        ContactUsView()
    }
}
