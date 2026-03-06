import SwiftUI

struct OnboardingSlide: Identifiable {
    let id = UUID()
    let image: String
    let title: String
    let description: String
}

struct OnboardingView: View {
    @SwiftUI.Environment(AppState.self) private var appState
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding: Bool = false
    
    @State private var currentTab = 0
    
    let slides = [
        OnboardingSlide(image: "bolt.fill", title: "Fast", description: "Experience lightning-fast transactions and instant top-ups anytime you need them."),
        OnboardingSlide(image: "lock.shield.fill", title: "Secure", description: "Your payments and data are protected with industry-leading security measures."),
        OnboardingSlide(image: "clock.arrow.circlepath", title: "Reliable", description: "Enjoy consistent 24/7 service availability. We are always here when you need us.")
    ]
    
    var body: some View {
        VStack {
            HStack {
                Spacer()
                Button(action: completeOnboarding) {
                    Text("Skip")
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                }
                .padding()
            }
            
            TabView(selection: $currentTab) {
                ForEach(0..<slides.count, id: \.self) { index in
                    OnboardingPageView(slide: slides[index])
                        .tag(index)
                }
            }
            .tabViewStyle(PageTabViewStyle(indexDisplayMode: .always))
            .indexViewStyle(PageIndexViewStyle(backgroundDisplayMode: .always))
            
            Button(action: {
                if currentTab < slides.count - 1 {
                    withAnimation {
                        currentTab += 1
                    }
                } else {
                    completeOnboarding()
                }
            }) {
                Text(currentTab == slides.count - 1 ? "Get Started" : "Next")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.orange)
                    .cornerRadius(12)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 48)
        }
    }
    
    private func completeOnboarding() {
        hasSeenOnboarding = true
        appState.currentRoute = .login
    }
}

struct OnboardingPageView: View {
    let slide: OnboardingSlide
    
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            Image(systemName: slide.image)
                .resizable()
                .scaledToFit()
                .frame(width: 120, height: 120)
                .foregroundStyle(.orange)
            
            Text(slide.title)
                .font(.title)
                .fontWeight(.bold)
            
            Text(slide.description)
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 32)
            
            Spacer()
        }
    }
}

#Preview {
    OnboardingView()
        .environment(AppState())
}
