/**
 * Page 1: Landing Page
 */
const LandingPage = {
  render() {
    const user = window.State.currentUser;

    return `
      <div class="landing-page">
        <!-- Hero Section -->
        <section class="landing-hero">
          <span class="landing-hero-tag"><i class="fas fa-sparkles"></i> Collaborative Travel Intelligence</span>
          <h1 class="landing-hero-title">Organize Group Trips, Track Budgets & Craft Timeless Memories</h1>
          <p class="landing-hero-desc">JourneyHub synchronizes day-wise itineraries, settles shared expenses fairly, resolves schedule overlaps, and unites group availability in one intuitive platform.</p>
          <div class="landing-hero-cta">
            ${user ? `
              <a href="#/dashboard" class="btn btn-teal btn-lg"><i class="fas fa-th-large"></i> Go to Dashboard</a>
              ${window.State.isOrganiser() ? `
                <a href="#/trips/create" class="btn btn-orange btn-lg"><i class="fas fa-plus-circle"></i> Create New Trip</a>
              ` : `
                <a href="#/explore-trips" class="btn btn-orange btn-lg"><i class="fas fa-compass"></i> Explore Published Trips</a>
              `}
            ` : `
              <a href="#/register" class="btn btn-teal btn-lg"><i class="fas fa-user-plus"></i> Get Started Free</a>
              <a href="#/login" class="btn btn-outline btn-lg" style="background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.3);"><i class="fas fa-sign-in-alt"></i> Sign In</a>
            `}
            <a href="#/explore-trips" class="btn btn-outline btn-lg" style="background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.3);"><i class="fas fa-compass"></i> Explore Trips</a>
            <a href="#/mystery-trips" class="btn btn-outline btn-lg" style="background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.3);"><i class="fas fa-mask"></i> Mystery Miles</a>
            <a href="#/destinations" class="btn btn-outline btn-lg" style="background: rgba(255,255,255,0.1); color: #fff; border-color: rgba(255,255,255,0.3);"><i class="fas fa-map-marked-alt"></i> Incredible India</a>
          </div>
        </section>

        <!-- Value Propositions Grid -->
        <div class="page-header" style="justify-content: center; text-align: center; margin-bottom: 2rem;">
          <div>
            <h2 class="page-title" style="font-size: 2rem;">Engineered for Seamless Group Travel</h2>
            <p class="page-subtitle">Purpose-built full-stack architecture solving real travel logistics without friction</p>
          </div>
        </div>

        <div class="features-grid">
          <div class="feature-box">
            <div class="feature-icon-wrapper"><i class="fas fa-calendar-check"></i></div>
            <h3 class="feature-title">Day-Wise Itinerary Planner</h3>
            <p class="feature-desc">Schedule activities down to the minute. The built-in interval overlap engine warns you before conflicts happen.</p>
          </div>

          <div class="feature-box">
            <div class="feature-icon-wrapper" style="background: var(--orange-50); color: var(--accent-orange);"><i class="fas fa-hand-holding-usd"></i></div>
            <h3 class="feature-title">Greedy Debt Simplification</h3>
            <p class="feature-desc">Who owes whom? The balance minimizer compresses messy group tabs into the fewest possible repayment transactions.</p>
          </div>

          <div class="feature-box">
            <div class="feature-icon-wrapper"><i class="fas fa-magic"></i></div>
            <h3 class="feature-title">What-If Trip Simulator</h3>
            <p class="feature-desc">Simulate hypothetical excursions, helicopter upgrades, or budget cuts in a sandbox before affecting the live trip.</p>
          </div>

          <div class="feature-box">
            <div class="feature-icon-wrapper" style="background: var(--orange-50); color: var(--accent-orange);"><i class="fas fa-history"></i></div>
            <h3 class="feature-title">Missed-Activity Recovery</h3>
            <p class="feature-desc">Flights delayed or bad weather? Mark any item as missed and let our smart gap-analyzer suggest open reschedule windows.</p>
          </div>

          <div class="feature-box">
            <div class="feature-icon-wrapper"><i class="fas fa-user-friends"></i></div>
            <h3 class="feature-title">Group Availability Matcher</h3>
            <p class="feature-desc">Each friend inputs their free dates. Our consensus algorithm identifies the calendar window with maximal group overlap.</p>
          </div>

          <div class="feature-box">
            <div class="feature-icon-wrapper" style="background: var(--orange-50); color: var(--accent-orange);"><i class="fas fa-shield-alt"></i></div>
            <h3 class="feature-title">Trip Readiness Gauge</h3>
            <p class="feature-desc">Live 5-pillar preparedness audit tracking itinerary coverage, packing percentage, confirmed vouchers, and emergency contacts.</p>
          </div>
        </div>

        <!-- Featured Destinations Preview -->
        <div style="background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl); padding: 2.5rem; margin-bottom: 3.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h3 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 800;">Featured Global Getaways</h3>
              <p style="font-size: 0.9rem; color: var(--text-secondary);">Handcrafted travel destinations with curated activities and estimated budgets</p>
            </div>
            <a href="#/destinations" class="btn btn-outline btn-sm">View All Destinations <i class="fas fa-arrow-right"></i></a>
          </div>

          <div class="trips-grid">
            <div class="trip-card" onclick="window.location.hash = '#/destinations'">
              <img src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80" class="trip-card-img" alt="Kyoto" />
              <div class="trip-card-content">
                <span class="badge badge-teal" style="align-self: flex-start; margin-bottom: 0.5rem;">Cultural • Japan</span>
                <h4 class="trip-card-title">Kyoto Shrines & Historic Groves</h4>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Explore ancient torii gates, imperial zen temples, and traditional tea ceremonies.</p>
                <div class="trip-card-footer">
                  <span style="font-size: 0.85rem; font-weight: 700; color: var(--primary-teal);">$140 / day</span>
                  <span style="font-size: 0.85rem; color: var(--text-muted);"><i class="fas fa-star" style="color: #f59e0b;"></i> 4.9</span>
                </div>
              </div>
            </div>

            <div class="trip-card" onclick="window.location.hash = '#/destinations'">
              <img src="https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80" class="trip-card-img" alt="Amalfi" />
              <div class="trip-card-content">
                <span class="badge badge-orange" style="align-self: flex-start; margin-bottom: 0.5rem;">Coast • Italy</span>
                <h4 class="trip-card-title">Amalfi Coast & Positano Cliffs</h4>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Pastel cliffside villages over turquoise Mediterranean waters and boat excursions.</p>
                <div class="trip-card-footer">
                  <span style="font-size: 0.85rem; font-weight: 700; color: var(--primary-teal);">$190 / day</span>
                  <span style="font-size: 0.85rem; color: var(--text-muted);"><i class="fas fa-star" style="color: #f59e0b;"></i> 4.8</span>
                </div>
              </div>
            </div>

            <div class="trip-card" onclick="window.location.hash = '#/destinations'">
              <img src="https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=600&q=80" class="trip-card-img" alt="Swiss Alps" />
              <div class="trip-card-content">
                <span class="badge badge-navy" style="align-self: flex-start; margin-bottom: 0.5rem;">Mountain • Switzerland</span>
                <h4 class="trip-card-title">Zermatt & Matterhorn Glacier</h4>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">Pristine alpine lakes, panoramic cogwheel railways, and world-class glacier hikes.</p>
                <div class="trip-card-footer">
                  <span style="font-size: 0.85rem; font-weight: 700; color: var(--primary-teal);">$220 / day</span>
                  <span style="font-size: 0.85rem; color: var(--text-muted);"><i class="fas fa-star" style="color: #f59e0b;"></i> 4.9</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

window.LandingPage = LandingPage;
