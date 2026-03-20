# Wine App UX/UI Design Patterns Research (2024-2025)

> Deep research conducted March 2025. Covers major wine apps and adjacent beverage/music apps for pattern inspiration.

---

## 1. Wine Variety/Grape Tracking: Blends vs Single Varietals

### How Major Apps Handle Grape Composition

**Vivino**
- Wine detail page shows grape variety as a metadata field (e.g., "Cabernet Sauvignon" or "Red Blend")
- For blends, Vivino uses broad category labels like "Red Blend" or "White Blend" at the top level
- Detailed grape composition percentages are NOT prominently displayed on the main wine card -- they appear deeper in the wine's supplementary data
- Taste characteristics (acidity, tannin, sweetness, body) are displayed as **horizontal slider spectrums** on the wine detail page, which is a more practical proxy for grape impact than raw percentages
- Community tasting notes surface grape-related flavor descriptors organically (e.g., "blackcurrant", "cherry") which correlate with grape composition

**CellarTracker**
- Categorizes wines as "Red Blend", "White Blend" etc. with varietal names embedded in the designation if they appear on the front label
- Detailed grape composition is stored in per-wine Wiki articles, contributed by the community
- Filtering by grape variety is supported in cellar management -- users can search their cellar "by wine type, down to the grape"
- The community-wiki model means blend data is crowd-sourced and can be very detailed for popular wines

**InVintory**
- Sommelier-curated database of 2M+ wines with professional-grade varietal data
- Grape variety is a first-class filter/sort dimension in cellar management
- No prominent percentage-breakdown visualization in the main UI

**VinoCell**
- 40+ data fields per wine, including detailed varietal information
- Grape composition can be manually entered with granular control
- Filtering by variety is a core navigation pattern

### Actionable Design Patterns

| Pattern | Description | Used By |
|---------|-------------|---------|
| **Broad Category + Detail Drill** | Show "Red Blend" at glance, detailed breakdown on tap | Vivino, CellarTracker |
| **Taste Spectrum Sliders** | Horizontal bars for Light-Bold, Dry-Sweet, Soft-Acidic, Soft-Tannic | Vivino |
| **Grape as Filter Dimension** | Allow filtering collection by grape variety | All major apps |
| **Community-Sourced Blend Data** | Let community contribute/verify blend percentages | CellarTracker |
| **Flavor Tags from Community** | Surface grape-indicative flavors from crowd-sourced notes | Vivino |

### Key Insight for Nyam
Most wine apps deliberately **de-emphasize exact blend percentages** in the primary UI because casual users find them intimidating. Instead, they use **taste characteristic spectrums** (the slider bars) as a more intuitive proxy. The Vivino spectrum pattern (Light/Bold, Dry/Sweet, Soft/Acidic, Soft/Tannic) is the industry standard. Grape variety is more useful as a **discovery/filter tool** than as a detail display element.

---

## 2. Wine Region/Origin Visualization

### Geographic Display Patterns

**Vivino Taste Profile**
- Breaks down user preferences by **region** alongside grape and style
- Shows "What You've Tried", "What You Like", "What You Dislike" for each region
- 4-tier level system per region: Explorer (1-5 wines), Enthusiast (6-25), Expert (26-99), Ambassador (100+)
- Region data powers recommendations throughout the app

**Wine Folly / Wine Maps App**
- Dedicated wine region maps covering 20+ countries with 122 detailed maps
- Visual reference for AVAs (American Viticultural Areas) and appellations
- Hierarchical zoom: Country -> Region -> Sub-region -> Appellation

**VinoCellar**
- Filters wines by country, region, and appellation
- Graphic cellar representation with region-based organization

**OENO by Vintec**
- Multi-location cellar tracking organized partly by region
- Search by grape variety for regional wine day occasions

### Map UI Best Practices (from General Map UX Research)
- **Progressive Disclosure by Zoom Level**: Show countries when zoomed out, regions at medium zoom, specific appellations when zoomed in
- **Marker Clustering**: Group wines by region at broad zoom, individual wines at close zoom
- **Information Density Management**: Decide what information is essential at each zoom level without overwhelming the user
- **Interactive Exploration**: Allow pan, zoom, and tap-to-explore rather than static image maps

### Geographic Journey Patterns

| Pattern | Description | Inspiration |
|---------|-------------|-------------|
| **Regional Level Progression** | Explorer -> Enthusiast -> Expert -> Ambassador per region | Vivino |
| **Heat Map of Exploration** | Color intensity showing which regions you've explored most | Spotify Wrapped concept |
| **Region Collection Badges** | Unlock badges for trying wines from new regions | Untappd style badges |
| **Geographic Timeline** | Chronological map showing wine journey over time | Spotify Wrapped map |
| **Country/Region Checklist** | Visual tracker of regions explored vs. not yet tried | Travel app pattern |

### Key Insight for Nyam
The **Vivino 4-tier regional expertise system** (Explorer through Ambassador) is a strong model that combines geographic tracking with gamification. For Nyam's restaurant-centric model, consider a **dual geographic journey**: wine regions explored AND restaurant neighborhoods/districts visited. A map visualization showing "your wine world" with heat-map intensity would be highly engaging and shareable.

---

## 3. Wine Statistics & Personal Insights

### Vivino Taste Profile System
- **Categories**: Style, Region, Grape -- each broken down into:
  - What You've Tried (count)
  - What You Like (high-rated)
  - What You Dislike (low-rated)
- **355 unique wine styles** combining regions with their famous grapes/blends
- **4-level progression** per category: Explorer, Enthusiast, Expert, Ambassador
- Smart algorithm connects drinking patterns to create statistical charts
- Profile is powered by "previously rated wines, purchases and even pageviews"
- Used to show friends' taste profiles for social discovery

### Untappd Recappd (Beer -- Analogous Pattern)
- **Annual Year-in-Review**: "Year in Beer" rebranded to "Recappd" in 2025
- **Animated Story View**: Dynamic, interactive statistics presentation
- **Key Stats Tracked**:
  - Total unique beers/breweries/styles tried
  - Top rated beers, styles, and breweries
  - Geographic spread (venues/cities/countries)
  - Check-in frequency and patterns
  - Style distribution breakdown
- **Style Hunt Badges**: Released in weekly batches (4 weeks x 3 badges), each unlock = sweepstakes entry
- **One-tap Social Sharing**: Designed for instant social media posting
- **Insider Premium Stats**: Year-round analytics access (paid tier) with exportable data

### Spotify Wrapped (Music -- Gold Standard for Shareable Stats)
- **Story-based Card Format**: Swipeable cards revealing stats one at a time in narrative sequence
- **Key UX Principles**:
  - Frames data as a **story/narrative**, not just numbers
  - Creates **emotional peaks** (your #1 song, total minutes listened)
  - **Hyper-personalization** -- 350 unique poster designs, each feels unique
  - **Social currency** -- designed from the ground up for Instagram/TikTok sharing
  - Bespoke typography (Spotify Mix typeface) as primary graphic element
  - Dynamic vibrant gradients with solid colors
  - Quiz elements and milestone celebrations interspersed with stats
  - Chronological storytelling that builds anticipation
- **Why It Works**: Combines personalization + narrative + shareability + FOMO

### Other Stats Approaches

**Sommo App**
- "Wine Character Reading" -- generates personalized archetypes and spirit animals based on taste
- Novelty/entertainment-first approach to statistics

**Good Pair Days**
- Points and badges management integrated with subscription service
- Gamified consumption tracking

### Key Metrics Tracked Across Wine Apps

| Metric Category | Specific Metrics |
|----------------|-----------------|
| **Volume** | Total wines rated, wines this month/year, drinking frequency |
| **Diversity** | Unique grapes tried, unique regions, unique styles, new discoveries |
| **Preferences** | Average rating, favorite grape/region/style, price range preference |
| **Social** | Reviews written, likes received, followers, recommendations accepted |
| **Progression** | Level/tier per category, badges earned, streak data |
| **Financial** | Collection value (InVintory), average price paid, price-to-rating correlation |

### Key Insight for Nyam
A **"Wine Wrapped"** feature combining Spotify's storytelling format with Vivino's category breakdowns would be extremely powerful. The card-swipe narrative format works because it creates anticipation and emotional connection. Key elements: total wines tried, top-rated wine, most-explored region, "taste personality" archetype, restaurant where you discovered the most wines. Make every stat card shareable as an individual image.

---

## 4. Wine Collection/Cellar Management

### Organization Patterns by App

**CellarTracker**
- **Filters**: Region, Variety, Price range (multi-select supported), Community rating
- **Sort**: Community rating, ascending/descending toggle
- **Display**: List view with wine card showing vintage, region, rating
- **Cellar Views**: Summary of vintages in one screen
- **Strength**: 13M+ ratings, 9M+ tasting notes from 8.8M users

**InVintory**
- **3D Cellar Visualization (VinLocate)**: Interactive spatial view showing exact bottle positions
- **White-Glove 3D Modeling**: Custom 3D rendering for high-value cellars
- **Real-Time Market Valuations**: Total collection value with per-bottle pricing
- **AI-Driven Recommendations**: "When to drink" suggestions
- **Govee Sensor Integration**: Temperature and humidity monitoring
- **Tiers**: Free, Premium (3D cellars + valuation), Elite

**VinoCell**
- **40+ Data Fields** per wine for maximum detail
- **Sort Options**: Winery, wine name, year, price, score, region, appellation, input date
- **3 Display Modes**: List, Grid, Full Screen
- **Custom Rack/Shelf Maps**: Including two-depth shelves
- **"Bottle Life"** tracking feature
- **4.6/5 stars** (App Store, October 2025)

**VinoCellar**
- **Filter by**: Country, region, who you last enjoyed the bottle with (social context!)
- **Graphic Cellar Representation**: Various rack configurations
- **Customized Bottle Appearance**: Hue and shape reflect wine type

**OENO by Vintec**
- **Multi-Location Cellar Tracking**: Drag-and-drop organization
- **Serving Recommendations**: Glassware, aeration time, temperature per wine
- **"Consumed" Logging**: Full drinking history

### Collection Organization Matrix

| Feature | CellarTracker | InVintory | VinoCell | OENO |
|---------|--------------|-----------|----------|------|
| Filter by Region | Yes | Yes | Yes | Yes |
| Filter by Grape | Yes | Yes | Yes | Yes |
| Filter by Vintage | Yes | Yes | Yes | Yes |
| 3D Cellar Map | No | Yes (VinLocate) | No (2D rack map) | No |
| Real-time Valuation | No | Yes | No | No |
| Multiple Display Modes | Limited | Yes | 3 modes | Yes |
| Custom Rack Layout | No | Yes (premium) | Yes | Drag-drop |
| Drink Window | Community notes | AI-driven | "Bottle Life" | Yes |
| Social Context Filter | No | No | No | No* |

*VinoCellar filters by "who you last enjoyed the bottle with"

### Key Insight for Nyam
For a **restaurant-centric** wine app, the traditional cellar management pattern needs adaptation. Instead of "cellar" think **"My Wine Journey"** or **"Wine Log"**. Key organizational axes should be: **by restaurant** (where you had it), **by occasion** (dinner date, business lunch, celebration), **by grape/region**, and **by rating**. The VinoCellar pattern of filtering by "who you enjoyed it with" is a standout social innovation that aligns perfectly with Nyam's restaurant + social DNA.

---

## 5. Wine Photo/Label Recognition UX

### Vivino's Camera Experience (Industry Standard)
- **Entry Point**: Large camera icon at the bottom center of the app (primary CTA)
- **Flow**: Open app -> Tap camera -> Point at label -> Auto-capture -> Instant results
- **Recognition Rate**: 97.5% automatic recognition
- **Fallback**: Manual team processes remaining 2.5% (200-500 new labels daily)
- **Scan Volume**: Users scan an average of 2 million labels daily
- **Technology**: Vuforia Cloud Recognition Service for label matching
- **Dual Mode**: Bottle label scan + Wine list/menu scan
- **Instant Results**: Rating, reviews, tasting notes, pricing appear immediately after scan
- **Vivino's Key UX Decision**: The camera button is the "centerpiece" of the app -- it's the biggest, most prominent button, designed to steal the show

### Wine List Scanner (Vivino)
- Separate mode for scanning restaurant wine lists
- Shows ratings inline for multiple wines at once
- Helps users compare options quickly at restaurants

### Other Label Scanning Approaches

**InVintory**: Label scanning with sommelier-curated database matching
**OENO by Vintec**: Uses Vivino's label recognition AI under the hood
**Sommo**: Automated label recognition eliminating manual data entry for journal entries
**Pocket Sommelier**: Wine list scanner with "pairability" percentages and price comparisons

### Camera UX Best Practices from Wine Apps

| Pattern | Description |
|---------|-------------|
| **Camera as Primary CTA** | Largest button in navigation, always accessible |
| **Real-time Viewfinder Guidance** | Frame overlay showing where to position the label |
| **Instant Feedback** | Results appear within 1-2 seconds of capture |
| **Graceful Fallback** | When recognition fails, offer manual search immediately |
| **Dual Context** | Support both bottle labels AND printed wine lists |
| **Progressive Enhancement** | Show basic match first, then load ratings/reviews/pricing |
| **One-tap to Record** | After scanning, one tap to add to collection/log a rating |

### Key Insight for Nyam
Nyam's existing photo-based wine registration flow aligns well with the Vivino pattern. The key differentiator for Nyam could be **restaurant menu scanning** -- not just individual bottles, but the full wine list at a restaurant, with ratings overlaid. This is a proven Vivino feature that works perfectly for a restaurant-centric app. Also consider: after scanning a wine at a restaurant, auto-associate it with that restaurant (GPS + venue matching).

---

## 6. Social Features in Wine Apps

### Vivino's Social Platform (65M+ Users)
- **Social Network Model**: Follows Instagram-like patterns
  - Follow/unfollow users
  - Photo posting to personal feeds
  - Like and comment on ratings
  - @ mention tagging in comments
- **Friend Discovery**: Facebook, Twitter, Google, contacts integration + manual search
- **Friend Activity Feed**: See friends' ratings, comments, and reviews in real-time
- **Taste Profile Sharing**: Show your profile to sommeliers/waiters for recommendations
- **Safety Features (2025)**: Follower list control, block unwanted users, privacy settings
- **Community Ratings**: 100,000 ratings submitted daily, fully community-driven scores

### CellarTracker's Community Approach
- **Review-Centric**: 13M+ ratings from 8.8M users
- **Community Tasting Notes**: 9M+ notes forming the world's largest wine review database
- **Transparency**: Open, community-driven data without algorithmic manipulation
- **Wine Detail Insights**: AI-generated summaries from community notes (new 2024-2025 feature)

### Delectable
- **Social Tagging**: Tag friends and locations in wine reviews
- **Location Logging**: Where you drank the wine is a first-class data point
- **Optional Rating**: Rating system doesn't activate unless explicitly engaged (low-pressure social)
- **Manual Wine Submission**: Reviewed within one hour (human-curated quality)

### Coravin
- **Moment-Capture**: Focus on sharing the experience/occasion, not just the wine
- **Wine-to-Media Pairing**: Suggests movies, TV shows, music to pair with wines (lifestyle integration)
- **Hardware Integration**: Bluetooth connectivity with physical Coravin devices

### Good Pair Days
- **Subscription Social**: Points and badges tied to subscription wine service
- **Community Events**: Social features centered around shared wine experiences

### Social Feature Matrix

| Feature | Vivino | CellarTracker | Delectable | Coravin |
|---------|--------|--------------|------------|---------|
| Follow/Feed | Yes | No | Yes | Limited |
| Like/Comment | Yes | Yes (reviews) | Yes | Yes |
| Photo Sharing | Yes | Limited | Yes | Yes (moments) |
| Location Tagging | No | No | Yes | Yes |
| Friend Recommendations | Yes (algorithm) | No | Yes (manual) | No |
| Privacy Controls | Yes (2025) | Basic | Yes | Yes |
| Taste Profile Social | Yes | No | No | No |

### Key Insight for Nyam
Nyam's **Bubble** feature (from existing docs) is already differentiated from the standard Vivino follow/feed model. Key competitive advantages to lean into: **restaurant/venue as social anchor** (vs. just wine), **occasion-based sharing** (Coravin's "moment capture" pattern), and **group taste profiles** (see how your bubble's taste evolves together). The Delectable pattern of **location as first-class data** is critical for Nyam.

---

## 7. Innovative/Unique Features

### Standout UX Innovations

**1. 3D Cellar Visualization (InVintory VinLocate)**
- Interactive spatial view of physical wine collection
- Users can virtually walk through their cellar to find bottles
- White-glove 3D modeling service for premium collectors
- Govee sensor integration for real-time temperature/humidity monitoring

**2. Augmented Reality Wine Labels (19 Crimes / Living Wine Labels)**
- Point camera at wine label -> animated story plays on screen
- 5.5M app downloads, 22M+ AR activations since 2017
- Expanded to 9 Treasury Wine Estates brands
- Snoop Dogg collaboration: 500K activations in first weeks
- Pattern: Turn static wine labels into interactive storytelling

**3. AR Experiences (Plonk by Bibendum)**
- AR experience integrated around illustrated varietal labels
- Color-coded tiles for wine type navigation
- Accessibility: Dyslexia-friendly text, reading masks, cognitive accessibility
- Focus on "drinking occasion" context (who, where, why)

**4. Wine Character Reading (Sommo)**
- AI generates personalized wine archetypes and "spirit animals"
- Entertainment-first approach to taste profiling
- WSET exam prep integration (Levels 1-4 with flashcards and mock exams)
- AI-powered menu scanning -- photograph a menu for instant pairing suggestions

**5. Conversational AI Search (Winedrops)**
- Natural language wine search eliminating expertise barriers
- "Tell me what you want" instead of filter-based discovery
- Designed for modern drinkers who don't know grape names

**6. Pairability Scoring (Pocket Sommelier)**
- Visual food recognition via photo -> instant wine pairing suggestions
- Wine list scanner showing "pairability" percentages per wine
- Price comparisons alongside pairing scores

**7. Social Context Filtering (VinoCellar)**
- Filter wines by "who you last enjoyed the bottle with"
- Combines social memory with wine discovery
- Unique approach connecting people to wine experiences

**8. WSET-Aligned Tasting Framework (VinoMemo)**
- Professional-grade systematic tasting framework (appearance, nose, palate, quality)
- Works offline for field tasting situations
- Educational scaffolding for serious learners

**9. Wine-to-Media Pairing (Coravin)**
- Suggests movies, TV shows, and music to pair with wines
- Lifestyle integration beyond food pairing
- "Moment-capture" functionality for experience sharing

**10. "Value For Money" Scale (AWESOMME)**
- Budget-conscious purchasing metric alongside quality rating
- AI ingredient-driven food pairing
- Completely free access model (no paywall)

### Onboarding Innovation

**Sippd Taste Quiz**
- 7-question onboarding quiz assessing: acidity preference, body preference, tannin preference, aroma/flavor profile, cuisine preferences, budget
- Output: Personalized "Taste Match" scores (1-100%) for every wine
- Pattern: Translate everyday food preferences to wine recommendations

**Good Pair Days Quiz**
- Visual, image-based quiz to determine wine personality
- Maps taste preferences (sweet vs. dry, fruity vs. earthy, bold vs. light) using everyday food/drink analogies
- Output: "Wine Tribe" personality assignment

**Winelikes**
- Fast palate quiz translating non-wine taste preferences to wine styles
- Asks about flavors enjoyed in everyday foods, then maps to wine

### Data Visualization Innovation

**Spider/Radar Charts for Wine Comparison**
- Plot acidity, tannins, sweetness, body, alcohol as axes
- Enable side-by-side comparison of multiple wines
- More intuitive than raw numbers for visual learners
- Tools: D3.js for dynamic, responsive implementations

**Interactive Flavor Wheels**
- Map tasting notes around aroma categories (fruity, floral, earthy, spicy)
- Click/hover to reveal detailed notes per category
- Bridge between professional wine vocabulary and casual user understanding

---

## 8. Cross-App Pattern Summary for Nyam

### Highest-Impact Patterns to Adopt

1. **Taste Spectrum Sliders** (Vivino) -- horizontal bars showing Light/Bold, Dry/Sweet, Soft/Acidic, Soft/Tannic. Industry standard, intuitive for beginners.

2. **Card-Based Shareable Stats** (Spotify Wrapped) -- swipeable story format for personal wine insights. Build for Instagram/KakaoTalk sharing from day one.

3. **Camera as Primary CTA** (Vivino) -- label scanning as the centerpiece action. For Nyam, extend to restaurant menu scanning.

4. **Regional Progression Tiers** (Vivino) -- Explorer/Enthusiast/Expert/Ambassador per region/grape. Natural fit with Nyam's existing XP system.

5. **Occasion-Based Recording** (Plonk/Coravin) -- capture the who/where/why alongside the wine. Differentiator for restaurant-centric app.

6. **3D/Spatial Visualization** (InVintory) -- while full 3D cellar may be overkill, the concept of spatial wine organization is compelling for restaurant-map views.

7. **Conversational AI Search** (Winedrops) -- "Find me something similar to what I had last Tuesday" instead of filter dropdowns.

8. **Social Context as Filter** (VinoCellar) -- "wines I drank with [person]" is a powerful memory/social feature.

### Nyam-Specific Opportunities

| Opportunity | Inspiration | Nyam Differentiation |
|-------------|-------------|---------------------|
| Restaurant-anchored wine journey | Delectable location tagging | Every wine record tied to a restaurant |
| Bubble taste evolution | Vivino taste profiles | Group taste profiles that evolve together |
| Wine Wrapped annual review | Spotify Wrapped | Restaurant + wine combined narrative |
| Menu scanning at restaurants | Vivino wine list scanner | Deep restaurant integration with ratings overlay |
| Taste quiz onboarding | Sippd 7-question quiz | Food-first quiz (what foods do you like?) |
| Wine "character" personality | Sommo archetypes | "Your wine personality" as shareable content |

---

## Sources

- [Vivino UX Case Study - Noriko Gondo](https://norikogondo.com/vivino/)
- [Best Wine Apps 2025 - InVintory](https://invintory.com/blog/best-wine-apps-top-tools-for-collectors-compared)
- [InVintory vs CellarTracker](https://invintory.com/blog/invintory-vs-cellartracker-which-app-fits-serious-collectors)
- [Vivino Social Features](https://www.vivino.com/en/wine-news/vivino-benefits-our-new-social-features-explained)
- [Vivino Taste Profile](https://www.vivino.com/releases/mytasteprofile)
- [Vivino Taste Characteristics](https://www.vivino.com/en/wine-news/wine-taste-characteristics)
- [Vivino Digital Experience - Symphony Solutions](https://symphony-solutions.com/insights/vivino-app-a-digital-wine-experience)
- [Vivino Label Scanning - PTC](https://www.ptc.com/en/case-studies/vivino)
- [CellarTracker Filter/Sort](https://support.cellartracker.com/article/83-how-to-sort-and-filter-your-wine-cellar)
- [Wine Apps 2026 - Travelling Corkscrew](https://travellingcorkscrew.com.au/blog/best-wine-apps/)
- [Best Wine Cellar Apps 2025 - ilovewine](https://ilovewine.com/wine-cellar-management-app/)
- [Untappd Recappd 2024](https://updates.untappd.com/post/768784620288425984/2024-year-in-beer)
- [Spotify Wrapped 2024 Design - Alex Jimenez](https://alexjimenezdesign.medium.com/three-design-elements-that-made-spotify-wrapped-2024-great-0a8e2b133b72)
- [Spotify Wrapped UX Psychology](https://medium.com/design-bootcamp/why-were-hooked-on-spotify-wrapped-the-perfect-blend-of-ux-and-psychology-b4aa06c9b81f)
- [19 Crimes AR - Sommeliers Choice Awards](https://sommelierschoiceawards.com/en/blog/insights-1/technology-and-wine-how-19-crimes-and-augmented-reality-has-helped-revolutionize-the-wine-label--275.htm)
- [Plonk App AR - Bibendum](https://www.bibendum-wine.co.uk/about/plonk-app/)
- [Sippd Wine Quiz](https://www.einnews.com/pr_news/598933103/sippd-debuts-wine-quiz-to-enhance-the-personalization-of-consumer-s-wine-recommendations)
- [Wine Spider Charts - WineMaker Mag](https://winemakermag.com/technique/visualize-sensory-evaluation-utilizing-spider-charts-to-compare-wines)
- [Winedrops AI - Must-Have 2025](https://winedrops.com/articles/the-must-have-app-of-2025/)
- [Map UI Design Best Practices - Eleken](https://www.eleken.co/blog-posts/map-ui-design)
- [Wine Maps - Wine Folly](https://winefolly.com/lifestyle/download-wine-maps/)
- [DesignRush Vivino](https://www.designrush.com/best-designs/apps/vivino)
- [Grape and Barrel Wine Management Guide](https://grapeandbarrel.com/wine-cellar-management-apps/)
- [Vivino on Behance](https://www.behance.net/gallery/95741019/Vivino-app-UIUX)
