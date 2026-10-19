/**
 * Page: Mystery Miles — Surprise Destination Reveal
 * Secret destinations remain encrypted until the reveal countdown finishes or organiser unlocks.
 */
const MysteryTripsPage = {
  mysteryTrips: [],
  timerInterval: null,

  render() {
    const isOrganiser = window.State.isOrganiser();

    return `
      <div class="page-container">
        <!-- Hero Banner -->
        <div class="jh-card" style="margin-bottom: 2rem; background: radial-gradient(circle at top right, rgba(13, 148, 136, 0.25), transparent 70%), linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; border: 1px solid rgba(255, 255, 255, 0.1); position: relative; overflow: hidden; padding: 2.5rem;">
          <div style="position: absolute; right: -20px; bottom: -20px; font-size: 10rem; color: rgba(255, 255, 255, 0.03); pointer-events: none;">
            <i class="fas fa-mask"></i>
          </div>

          <div style="max-width: 680px; position: relative; z-index: 2;">
            <span class="badge" style="background: rgba(13, 148, 136, 0.3); color: #2dd4bf; border: 1px solid #0d9488; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 0.75rem;">
              <i class="fas fa-sparkles"></i> Exclusive Adventure Mode
            </span>
            <h1 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem; line-height: 1.2;">
              Mystery Miles: Surprise Reveal
            </h1>
            <p style="color: #cbd5e1; font-size: 1rem; line-height: 1.6; margin-bottom: 1.5rem;">
              Book an adventure without knowing where you're headed! Pack based on cryptic hints, decode rolling clues, and experience the synchronized live destination reveal.
            </p>

            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
              ${isOrganiser ? `
                <button class="btn btn-teal btn-md" onclick="MysteryTripsPage.openCreateModal()" style="box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                  <i class="fas fa-plus-circle"></i> Create Mystery Trip
                </button>
              ` : ''}
              <a href="#/explore-trips" class="btn btn-outline btn-md" style="color: #fff; border-color: rgba(255, 255, 255, 0.3);">
                <i class="fas fa-compass"></i> Explore All Trips
              </a>
            </div>
          </div>
        </div>

        <!-- Mystery Trips Feed -->
        <div id="mystery-trips-feed" style="display: flex; flex-direction: column; gap: 2rem;">
          <div style="text-align: center; padding: 3rem;" class="jh-card">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-secondary);">Decrypting mystery coordinates...</p>
          </div>
        </div>
      </div>
    `;
  },

  async mount() {
    await this.fetchMysteryTrips();
    this.renderFeed();
    this.startCountdownTimer();
  },

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  async fetchMysteryTrips() {
    try {
      const res = await window.API.get('/api/mystery-trips');
      this.mysteryTrips = res?.mysteryTrips || [];
    } catch (err) {
      window.Toast?.show('Failed to load mystery trips: ' + err.message, 'error');
    }
  },

  startCountdownTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      this.mysteryTrips.forEach(trip => {
        if (trip.isRevealed) return;
        const revealTime = new Date(trip.revealAt).getTime();
        const now = Date.now();
        const diff = revealTime - now;

        const elDays = document.getElementById(`cd-days-${trip._id}`);
        const elHours = document.getElementById(`cd-hours-${trip._id}`);
        const elMins = document.getElementById(`cd-mins-${trip._id}`);
        const elSecs = document.getElementById(`cd-secs-${trip._id}`);

        if (diff <= 0) {
          if (elDays) {
            // Auto trigger reload if just revealed
            this.fetchMysteryTrips().then(() => this.renderFeed());
          }
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (elDays) elDays.textContent = String(days).padStart(2, '0');
        if (elHours) elHours.textContent = String(hours).padStart(2, '0');
        if (elMins) elMins.textContent = String(minutes).padStart(2, '0');
        if (elSecs) elSecs.textContent = String(seconds).padStart(2, '0');
      });
    }, 1000);
  },

  renderFeed() {
    const container = document.getElementById('mystery-trips-feed');
    if (!container) return;

    if (this.mysteryTrips.length === 0) {
      container.innerHTML = `
        <div class="jh-card" style="text-align: center; padding: 4rem 1rem;">
          <i class="fas fa-mask" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
          <h2 style="font-weight: 700; color: var(--text-main);">No Mystery Trips Currently Active</h2>
          <p style="color: var(--text-secondary); max-width: 450px; margin: 0.5rem auto 1.5rem auto;">
            Tour organisers launch mystery trips periodically. Check back soon or browse regular trips!
          </p>
          ${window.State.isOrganiser() ? `
            <button class="btn btn-teal btn-md" onclick="MysteryTripsPage.openCreateModal()">
              <i class="fas fa-plus"></i> Launch Mystery Trip
            </button>
          ` : `
            <a href="#/explore-trips" class="btn btn-teal btn-md">Browse Published Trips</a>
          `}
        </div>
      `;
      return;
    }

    const isOrganiser = window.State.isOrganiser();
    const currentUserId = window.State.currentUser?._id ? window.State.currentUser._id.toString() : (window.State.currentUser?.id ? window.State.currentUser.id.toString() : '');

    container.innerHTML = this.mysteryTrips.map(trip => {
      const orgId = trip.organiserId?._id ? trip.organiserId._id.toString() : (trip.organiserId ? trip.organiserId.toString() : '');
      const isOwner = isOrganiser && orgId === currentUserId;
      const isRevealed = trip.isRevealed;
      const clues = trip.clues || [];
      const participants = trip.participants || [];
      const currentParticipant = participants.find(p => {
        const pUid = p.user?._id ? p.user._id.toString() : (p.user ? p.user.toString() : '');
        return pUid && pUid === currentUserId;
      });

      const cover = isRevealed 
        ? (trip.revealedCoverImage || trip.coverImage) 
        : (trip.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80');

      return `
        <div class="jh-card" style="padding: 0; overflow: hidden; border: ${isRevealed ? '2px solid #10b981' : '1px solid var(--border-color)'};">
          <!-- Mystery Header Banner with Countdown -->
          <div style="position: relative; height: 300px; background: #0f172a; overflow: hidden;">
            <img src="${cover}" alt="Mystery Destination" style="width: 100%; height: 100%; object-fit: cover; filter: ${isRevealed ? 'none' : 'brightness(0.65) blur(1px)'};" />
            
            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.85) 100%);"></div>

            <!-- Top Badges -->
            <div style="position: absolute; top: 1rem; left: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <span class="badge ${isRevealed ? 'badge-success' : 'badge-teal'}" style="backdrop-filter: blur(4px);">
                <i class="fas ${isRevealed ? 'fa-unlock' : 'fa-lock'}"></i> ${isRevealed ? 'DESTINATION REVEALED' : 'CONFIDENTIAL DESTINATION'}
              </span>
              <span class="badge badge-navy" style="background: rgba(15,23,42,0.8); backdrop-filter: blur(4px);">
                <i class="fas fa-tag"></i> ${window.formatCurrency(trip.price, trip.currency)} per seat
              </span>
            </div>

            ${isOwner && !isRevealed ? `
              <div style="position: absolute; top: 1rem; right: 1rem;">
                <button class="btn btn-warning btn-sm" onclick="MysteryTripsPage.manualReveal('${trip._id}')" title="Manually unlock destination for all travelers">
                  <i class="fas fa-key"></i> Reveal Now (Organiser Unlock)
                </button>
              </div>
            ` : ''}

            <!-- Bottom Content inside Hero -->
            <div style="position: absolute; bottom: 1.5rem; left: 1.5rem; right: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem;">
              <div>
                <h2 style="font-size: 1.75rem; font-weight: 800; color: #fff; margin-bottom: 0.35rem;">
                  ${trip.title}
                </h2>
                <div style="color: #94a3b8; font-size: 0.9rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                  <span><i class="fas fa-calendar-alt" style="color: var(--primary-teal);"></i> ${new Date(trip.departureDate).toLocaleDateString()} - ${new Date(trip.returnDate).toLocaleDateString()}</span>
                  <span>•</span>
                  <span><i class="fas fa-chair" style="color: var(--accent-orange, #f59e0b);"></i> ${trip.availableSeats} of ${trip.maxParticipants} Seats Left</span>
                </div>
              </div>

              <!-- Live Countdown Clock -->
              ${!isRevealed ? `
                <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem; backdrop-filter: blur(8px);">
                  <div style="text-align: center;">
                    <div id="cd-days-${trip._id}" style="font-size: 1.4rem; font-weight: 800; color: #fff; line-height: 1;">--</div>
                    <div style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase;">Days</div>
                  </div>
                  <span style="font-weight: 700; color: #64748b;">:</span>
                  <div style="text-align: center;">
                    <div id="cd-hours-${trip._id}" style="font-size: 1.4rem; font-weight: 800; color: #fff; line-height: 1;">--</div>
                    <div style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase;">Hours</div>
                  </div>
                  <span style="font-weight: 700; color: #64748b;">:</span>
                  <div style="text-align: center;">
                    <div id="cd-mins-${trip._id}" style="font-size: 1.4rem; font-weight: 800; color: #fff; line-height: 1;">--</div>
                    <div style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase;">Mins</div>
                  </div>
                  <span style="font-weight: 700; color: #64748b;">:</span>
                  <div style="text-align: center;">
                    <div id="cd-secs-${trip._id}" style="font-size: 1.4rem; font-weight: 800; color: #2dd4bf; line-height: 1;">--</div>
                    <div style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase;">Secs</div>
                  </div>
                </div>
              ` : `
                <div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; border-radius: 8px; padding: 0.75rem 1.25rem; text-align: right;">
                  <div style="font-size: 0.75rem; color: #6ee7b7; text-transform: uppercase; font-weight: 700;">Secret Destination Unveiled</div>
                  <div style="font-size: 1.4rem; font-weight: 800; color: #fff;"><i class="fas fa-map-pin" style="color: #ef4444;"></i> ${trip.destinationSecret || trip.destinationHint}</div>
                </div>
              `}
            </div>
          </div>

          <!-- Body Content: Clues & Itinerary -->
          <div style="padding: 1.75rem;">
            <!-- Destination Hint Banner -->
            <div style="background: ${isRevealed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(13, 148, 136, 0.08)'}; border: 1px solid ${isRevealed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(13, 148, 136, 0.2)'}; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
              <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
                <div style="color: ${isRevealed ? '#10b981' : 'var(--primary-teal)'}; font-size: 1.2rem; margin-top: 0.1rem;">
                  <i class="fas ${isRevealed ? 'fa-bullhorn' : 'fa-lightbulb'}"></i>
                </div>
                <div>
                  <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">
                    ${isRevealed ? 'Unveiled Destination Coordinates:' : 'Cryptic Destination Teaser:'}
                  </h4>
                  <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0; font-style: italic;">
                    "${trip.destinationHint}"
                  </p>
                </div>
              </div>
            </div>

            <!-- Clues Progressive Cards -->
            <div style="margin-bottom: 1.75rem;">
              <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-puzzle-piece" style="color: var(--accent-orange, #f59e0b);"></i> Decoded Journey Clues
              </h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                ${clues.map((clue, idx) => `
                  <div class="jh-card" style="padding: 1rem; border-left: 3px solid var(--primary-teal); background: var(--bg-surface, #f8fafc);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                      <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary-teal); text-transform: uppercase;">Clue #${idx + 1}</span>
                      <span style="font-size: 0.7rem; color: var(--text-muted);"><i class="fas fa-check"></i> Unlocked</span>
                    </div>
                    <p style="font-size: 0.875rem; color: var(--text-main); margin: 0; line-height: 1.4;">
                      "${clue.clueText}"
                    </p>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Revealed Itinerary (If Revealed) -->
            ${isRevealed && trip.itinerary && trip.itinerary.length > 0 ? `
              <div style="margin-bottom: 1.75rem;">
                <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                  <i class="fas fa-route" style="color: var(--primary-teal);"></i> Full Unveiled Daily Schedule
                </h3>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                  ${trip.itinerary.map(item => `
                    <div class="jh-card" style="padding: 1rem; display: flex; gap: 1rem; align-items: flex-start;">
                      <div style="background: var(--primary-teal); color: #fff; font-weight: 800; font-size: 0.8rem; padding: 0.35rem 0.6rem; border-radius: 6px; flex-shrink: 0;">
                        DAY ${item.dayNumber}
                      </div>
                      <div>
                        <h4 style="font-size: 0.95rem; font-weight: 700; margin: 0 0 0.2rem 0; color: var(--text-main);">${item.title}</h4>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">${item.description}</p>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Packing & Travel Instructions -->
            <div style="margin-bottom: 1.75rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="jh-card" style="padding: 1rem;">
                <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem;">
                  <i class="fas fa-suitcase-rolling" style="color: var(--primary-teal);"></i> Travel & Packing Guidelines
                </h4>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                  ${trip.travelInstructions || 'Comfortable walking shoes, weather layers, and valid photo ID.'}
                </p>
              </div>

              <div class="jh-card" style="padding: 1rem;">
                <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem;">
                  <i class="fas fa-bed" style="color: var(--accent-orange, #f59e0b);"></i> Secret Stay Standard
                </h4>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                  ${trip.accommodationDetails || 'Handpicked premium resort with local dining.'}
                </p>
              </div>
            </div>

            <!-- Footer Action Section -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
              <div style="font-size: 0.85rem; color: var(--text-muted);">
                Organised by <strong>${trip.organiserId?.name || 'Verified Tour Organiser'}</strong>
              </div>

              <div>
                ${!window.State.currentUser ? `
                  <a href="#/login" class="btn btn-teal btn-md">Log in to Join Expedition</a>
                ` : currentParticipant ? `
                  <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    <span class="badge ${currentParticipant.status === 'approved' ? 'badge-success' : currentParticipant.status === 'rejected' ? 'badge-danger' : 'badge-warning'}" style="font-size: 0.85rem; padding: 0.5rem 0.85rem;">
                      <i class="fas ${currentParticipant.status === 'approved' ? 'fa-check-circle' : currentParticipant.status === 'rejected' ? 'fa-times-circle' : 'fa-clock'}"></i>
                      ${currentParticipant.status === 'approved' ? 'Enrolled in Mystery Expedition' : currentParticipant.status === 'rejected' ? 'Request Declined' : 'Application Pending Approval'}
                    </span>
                    <a href="#/my-requests" class="btn btn-outline btn-sm">View in My Requests</a>
                  </div>
                ` : isOwner ? `
                  <span class="badge badge-teal" style="padding: 0.5rem 1rem;">Your Organised Mystery Trip</span>
                ` : trip.availableSeats <= 0 ? `
                  <button class="btn btn-outline btn-md" disabled>Expedition Full</button>
                ` : `
                  <button class="btn btn-teal btn-md" onclick="MysteryTripsPage.joinMysteryTrip('${trip._id}', '${trip.title.replace(/'/g, "\\'")}')">
                    <i class="fas fa-ticket-alt"></i> Join Mystery Expedition (₹${trip.price})
                  </button>
                `}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async joinMysteryTrip(tripId, tripTitle) {
    if (!confirm(`Confirm request to reserve your seat for "${tripTitle}"? Coordinates will be revealed when countdown terminates.`)) return;

    try {
      await window.API.post(`/api/mystery-trips/${tripId}/join`, {
        message: 'Excited for the mystery expedition!'
      });
      window.Toast?.show('Joined mystery expedition! Your application has been logged.', 'success');
      await this.fetchMysteryTrips();
      this.renderFeed();
    } catch (err) {
      window.Toast?.show(err.message || 'Could not join mystery trip', 'error');
    }
  },

  async manualReveal(tripId) {
    if (!confirm('Are you sure you want to trigger the Live Reveal? This will unmask the secret destination and itinerary for all travelers immediately.')) {
      return;
    }

    try {
      const res = await window.API.post(`/api/mystery-trips/${tripId}/reveal`);
      window.Toast?.show('🎉 Destination Unveiled! Secret coordinates broadcasted.', 'success');
      await this.fetchMysteryTrips();
      this.renderFeed();
    } catch (err) {
      window.Toast?.show('Could not reveal destination: ' + err.message, 'error');
    }
  },

  openCreateModal() {
    window.Modal.open({
      title: 'Launch a New Mystery Miles Trip',
      body: `
        <form id="create-mystery-form">
          <div class="form-group">
            <label class="form-label" for="my-title">Trip Title <span style="color: var(--danger, #ef4444);">*</span></label>
            <input type="text" id="my-title" class="form-control" placeholder="e.g. Whispering Peaks Mystery Expedition" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label" for="my-secret">Secret Destination <span style="color: var(--danger, #ef4444);">*</span></label>
              <input type="text" id="my-secret" class="form-control" placeholder="e.g. Spiti Valley, Himachal" required />
              <div style="font-size: 0.7rem; color: #ef4444; margin-top: 0.2rem;">Strictly encrypted from users until reveal!</div>
            </div>

            <div class="form-group">
              <label class="form-label" for="my-reveal-at">Surprise Reveal Date & Time <span style="color: var(--danger, #ef4444);">*</span></label>
              <input type="datetime-local" id="my-reveal-at" class="form-control" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="my-hint">Destination Teaser Hint</label>
            <input type="text" id="my-hint" class="form-control" placeholder="e.g. An ancient cold desert kingdom of fossil hills and painted gompas" />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem;">
            <div class="form-group">
              <label class="form-label" for="my-price">Price (₹)</label>
              <input type="number" id="my-price" class="form-control" value="12500" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="my-seats">Max Capacity</label>
              <input type="number" id="my-seats" class="form-control" value="12" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="my-dep-date">Departure Date</label>
              <input type="date" id="my-dep-date" class="form-control" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="my-clue-1">First Released Clue</label>
            <input type="text" id="my-clue-1" class="form-control" placeholder="e.g. The world highest post office resides near our destination ridge." />
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-outline btn-sm" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-teal btn-sm" onclick="MysteryTripsPage.submitCreateMystery()">
          <i class="fas fa-lock"></i> Launch Mystery Trip
        </button>
      `
    });

    // Default dates
    const now = new Date();
    const reveal = new Date(now.getTime() + 86400000 * 2);
    const dep = new Date(now.getTime() + 86400000 * 7);

    const elReveal = document.getElementById('my-reveal-at');
    const elDep = document.getElementById('my-dep-date');

    if (elReveal) {
      elReveal.value = reveal.toISOString().slice(0, 16);
    }
    if (elDep) {
      elDep.value = dep.toISOString().slice(0, 10);
    }
  },

  async submitCreateMystery() {
    const title = document.getElementById('my-title')?.value.trim();
    const destinationSecret = document.getElementById('my-secret')?.value.trim();
    const revealAt = document.getElementById('my-reveal-at')?.value;
    const destinationHint = document.getElementById('my-hint')?.value.trim();
    const price = Number(document.getElementById('my-price')?.value) || 10000;
    const maxParticipants = Number(document.getElementById('my-seats')?.value) || 12;
    const depDateStr = document.getElementById('my-dep-date')?.value;
    const clueText = document.getElementById('my-clue-1')?.value.trim();

    if (!title || !destinationSecret || !revealAt || !depDateStr) {
      window.Toast?.show('Please fill in all required fields.', 'warning');
      return;
    }

    const departureDate = new Date(depDateStr);
    const returnDate = new Date(departureDate);
    returnDate.setDate(returnDate.getDate() + 4);

    const clues = clueText ? [{ clueText, isReleased: true }] : [];

    try {
      await window.API.post('/api/mystery-trips', {
        title,
        destinationSecret,
        destinationHint: destinationHint || 'A concealed haven waiting to be unveiled.',
        revealAt,
        price,
        maxParticipants,
        availableSeats: maxParticipants,
        departureDate,
        returnDate,
        clues
      });

      window.Modal.close();
      window.Toast?.show('Mystery Miles trip created! Coordinates are locked.', 'success');
      await this.fetchMysteryTrips();
      this.renderFeed();
    } catch (err) {
      window.Toast?.show(err.message || 'Could not launch mystery trip', 'error');
    }
  }
};

window.MysteryTripsPage = MysteryTripsPage;
