import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Play, Info, Share2, ChevronLeft, ChevronRight, ArrowLeft, Star, Calendar, Clock } from 'lucide-react';

// Main App component that holds the entire application's state and logic
const Index = () => {
  // State for the main list of displayed items
  const [items, setItems] = useState([]);
  // State for the currently active category ('home', 'movie', 'tv', or 'anime')
  const [category, setCategory] = useState('home');
  // State for the current page number for pagination
  const [page, setPage] = useState(1);
  // State for the current search term from the input field
  const [searchTerm, setSearchTerm] = useState('');
  // State to handle the initial loading status
  const [isLoading, setIsLoading] = useState(true);
  // State to handle the loading status for the "Load More" button
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  // State to hold any potential API errors
  const [error, setError] = useState(null);
  // State to hold the item selected by the user for detailed view
  const [selectedItem, setSelectedItem] = useState(null);
  // State to hold the top movies for the home screen carousel
  const [topMovies, setTopMovies] = useState([]);
  // State to hold the top 10 movies and TV shows for the weekly section
  const [topWeeklyItems, setTopWeeklyItems] = useState([]);

  // TMDB API configuration.
  const tmdbApiKey = "3ca43ac7d6fb0198ecb572fa4db184bb";
  const tmdbApiUrl = "https://api.themoviedb.org/3";
  // Base URL for TMDB images. Posters are fetched using relative paths.
  const tmdbImageBaseUrl = "https://image.tmdb.org/t/p/w500/";
  // OMDb API key for additional movie data, including IMDb and Rotten Tomatoes ratings.
  const omdbApiKey = "e8b15d91"; // You can get a free key from omdbapi.com

  // Function to fetch data from TMDB's discover endpoints
  const fetchData = useCallback(async (pageToFetch) => {
    setIsLoading(true);
    try {
      let url;
      const params = new URLSearchParams({
        api_key: tmdbApiKey,
        page: pageToFetch,
        sort_by: 'popularity.desc', // Fetch by popularity
        'with_original_language': 'en',
      });

      // Handle different categories
      if (category === 'movie') {
        url = `${tmdbApiUrl}/discover/movie?${params.toString()}`;
      } else if (category === 'tv') {
        url = `${tmdbApiUrl}/discover/tv?${params.toString()}`;
      } else if (category === 'anime') {
        // For 'anime', we'll perform a search since there isn't a dedicated "discover" endpoint for it.
        url = `${tmdbApiUrl}/search/multi?api_key=${tmdbApiKey}&query=anime&page=${pageToFetch}`;
      } else {
         // Default to movies for the home page when loading the full list
         url = `${tmdbApiUrl}/discover/movie?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      // Normalize the data from the TMDB response format
      const formattedItems = data.results
        .filter(item => item.media_type !== 'person' && item.poster_path) // Filter out people and items without posters
        .map(item => ({
        id: item.id,
        title: item.title || item.name, // TMDB uses `title` for movies, `name` for TV
        description: item.overview || 'No synopsis available.',
        mediaType: item.media_type || (category === 'movie' ? 'movie' : (category === 'tv' ? 'tv' : 'movie')),
        // Construct the full image URL from the relative path
        poster: item.poster_path ? `${tmdbImageBaseUrl}${item.poster_path}` : "https://placehold.co/300x450/4B5563/FFFFFF?text=Image+Unavailable",
        backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/original/${item.backdrop_path}` : "https://placehold.co/1280x720/1F2937/FFFFFF?text=Image+Unavailable",
        rating: item.vote_average,
        releaseDate: item.release_date || item.first_air_date,
      }));
      
      setError(null);
      return formattedItems;
    } catch (e) {
      console.error(`Failed to fetch items:`, e);
      setError(`Failed to fetch items. Please check your API key and network connection.`);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [tmdbApiKey, tmdbApiUrl, tmdbImageBaseUrl, category]);

  // Function to fetch search data from TMDB's multi-search endpoint
  const fetchSearchData = useCallback(async (query) => {
    if (!query) return [];
    
    setIsLoading(true);
    try {
      const url = `${tmdbApiUrl}/search/multi?api_key=${tmdbApiKey}&query=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setError(null);
      // Filter out 'person' results and items without a poster
      return data.results
        .filter(item => item.media_type !== 'person' && item.poster_path)
        .map(item => ({
          id: item.id,
          title: item.title || item.name,
          description: item.overview || 'No synopsis available.',
          mediaType: item.media_type,
          poster: item.poster_path ? `${tmdbImageBaseUrl}${item.poster_path}` : "https://placehold.co/300x450/4B5563/FFFFFF?text=Image+Unavailable",
          backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/original/${item.backdrop_path}` : "https://placehold.co/1280x720/1F2937/FFFFFF?text=Image+Unavailable",
          rating: item.vote_average,
          releaseDate: item.release_date || item.first_air_date,
        }));
    } catch (e) {
      console.error('Failed to fetch search results:', e);
      setError('Failed to fetch search results. Please try again later.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [tmdbApiKey, tmdbApiUrl, tmdbImageBaseUrl]);

  // Effect to handle data fetching based on category
  useEffect(() => {
    const initialFetch = async () => {
      setItems([]);
      // Only fetch the full list if not on the home page
      if (category !== 'home') {
        const newItems = await fetchData(1);
        setItems(newItems);
        setPage(1);
        setTopMovies([]); // Clear top movies when not on home
        setTopWeeklyItems([]); // Clear top weekly items
      } else {
        // For the home page, fetch trending movies, top weekly items, and the full paginated list
        setIsLoading(true);
        try {
            const [trendingResponse, weeklyTrendingResponse, discoveryResponse] = await Promise.all([
                fetch(`${tmdbApiUrl}/trending/movie/week?api_key=${tmdbApiKey}&page=1`),
                // Fetch trending movies and TV shows for the week
                fetch(`${tmdbApiUrl}/trending/all/week?api_key=${tmdbApiKey}`),
                fetchData(1)
            ]);

            const trendingData = await trendingResponse.json();
            const trendingMovies = trendingData.results.map(item => ({
                id: item.id,
                title: item.title || item.name,
                description: item.overview || 'No synopsis available.',
                mediaType: 'movie',
                poster: item.poster_path ? `${tmdbImageBaseUrl}${item.poster_path}` : "https://placehold.co/300x450/4B5563/FFFFFF?text=Image+Unavailable",
                backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/original/${item.backdrop_path}` : "https://placehold.co/1280x720/1F2937/FFFFFF?text=Image+Unavailable",
                rating: item.vote_average,
                releaseDate: item.release_date || item.first_air_date,
            }));
            
            const weeklyTrendingData = await weeklyTrendingResponse.json();
            const topTenItems = weeklyTrendingData.results.slice(0, 10).map(item => ({
              id: item.id,
              title: item.title || item.name,
              description: item.overview || 'No synopsis available.',
              mediaType: item.media_type,
              poster: item.poster_path ? `${tmdbImageBaseUrl}${item.poster_path}` : "https://placehold.co/300x450/4B5563/FFFFFF?text=Image+Unavailable",
              backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/original/${item.backdrop_path}` : "https://placehold.co/1280x720/1F2937/FFFFFF?text=Image+Unavailable",
              rating: item.vote_average,
              releaseDate: item.release_date || item.first_air_date,
            }));

            setTopMovies(trendingMovies);
            setTopWeeklyItems(topTenItems);
            setItems(discoveryResponse);
            setPage(1);
        } catch (e) {
            console.error('Failed to fetch initial data:', e);
            setError('Failed to fetch movies. Please check your network connection.');
        } finally {
            setIsLoading(false);
        }
      }
    };

    // Only fetch data if there is no active search term
    if (!searchTerm) {
      initialFetch();
    }
  }, [category, searchTerm, fetchData, tmdbApiKey, tmdbApiUrl, tmdbImageBaseUrl]);

  // Effect to handle the live search with a debounce timer
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (searchTerm) {
        setItems([]);
        const searchResults = await fetchSearchData(searchTerm);
        setItems(searchResults);
      } else {
        // When search is cleared, refetch based on current filters
        setItems([]);
        if (category !== 'home') {
          const newItems = await fetchData(1);
          setItems(newItems);
        } else {
          // On home page, clear search results and show the main list
          const newItems = await fetchData(1);
          setItems(newItems);
        }
      }
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, fetchSearchData, fetchData, category]);

  // Function to handle loading the next page of items
  const handleLoadMore = async () => {
    setIsFetchingMore(true);
    const nextPage = page + 1;
    const newItems = await fetchData(nextPage);
    setItems(prevItems => [...prevItems, ...newItems]);
    setPage(nextPage);
    setIsFetchingMore(false);
  };
  
  // Handlers for UI state changes
  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setSearchTerm('');
  };

  // Function to set the selected item for detailed view
  const handleItemSelect = (item) => {
    setSelectedItem(item);
  };

  // Function to clear the selected item and go back to the main list
  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Conditional rendering: show details or main list */}
      {selectedItem ? (
        // If an item is selected, show the details component
        <MovieDetails 
          item={selectedItem} 
          onClose={handleCloseDetails} 
          tmdbApiKey={tmdbApiKey} 
          tmdbApiUrl={tmdbApiUrl} 
          omdbApiKey={omdbApiKey}
        />
      ) : (
        // Otherwise, show the main list view
        <div className="animate-slide-up">
          {/* Header component with the app title, category buttons, and search bar */}
          <Header 
            searchTerm={searchTerm} 
            onSearchChange={setSearchTerm} 
            category={category}
            onCategoryChange={handleCategoryChange}
          />

          {/* Conditional rendering for loading, error, and item list states */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-secondary rounded-full animate-spin animate-pulse"></div>
              </div>
            </div>
          ) : error ? (
            <div className="text-center text-error text-lg py-12 animate-scale-in">{error}</div>
          ) : (
            <div className="px-4 sm:px-8">
              {/* Render the animated hero carousel only on the home page */}
              {category === 'home' && topMovies.length > 0 && (
                <div className="mb-12">
                  <AnimatedHeroCarousel movies={topMovies} onItemSelect={handleItemSelect} />
                  {/* Render the top weekly section */}
                  {topWeeklyItems.length > 0 && (
                    <TopWeeklySection items={topWeeklyItems} onItemSelect={handleItemSelect} />
                  )}
                  <div className="mt-16 mb-8">
                    <h2 className="text-3xl font-bold text-gradient mb-2">All Movies</h2>
                    <div className="h-1 w-24 bg-gradient-primary rounded-full"></div>
                  </div>
                </div>
              )}
              
              {/* Pass the new click handler to the ItemList component */}
              <ItemList items={items} onItemSelect={handleItemSelect} />
              
              {/* "Load More" button, shown only when not searching and not loading more */}
              {searchTerm === '' && !isFetchingMore && items.length > 0 && (
                <div className="flex justify-center mt-12 pb-8">
                  <button
                    onClick={handleLoadMore}
                    className="group relative px-8 py-4 bg-gradient-primary text-primary-foreground font-semibold rounded-xl hover-lift hover-glow transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative z-10">Load More</span>
                    <div className="absolute inset-0 bg-gradient-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                </div>
              )}
              {/* Loading indicator for the "Load More" button */}
              {isFetchingMore && (
                <div className="flex justify-center mt-8 pb-8">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Header component with the app title, category buttons, and search input
const Header = ({ searchTerm, onSearchChange, category, onCategoryChange }) => {
  return (
    <header className="sticky top-0 z-40 glass backdrop-blur-xl border-b border-border-subtle">
      <div className="px-4 sm:px-8 py-6">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="animate-slide-in-left">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-gradient">
              CinemaOS
            </h1>
            <p className="text-foreground-muted text-sm mt-1">Discover your next favorite movie</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {[
              { key: 'home', label: 'Home' },
              { key: 'movie', label: 'Movies' },
              { key: 'tv', label: 'TV Shows' },
              { key: 'anime', label: 'Anime' }
            ].map((cat, index) => (
              <button
                key={cat.key}
                onClick={() => onCategoryChange(cat.key)}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-300 transform hover:scale-105 ${
                  category === cat.key
                    ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                    : 'bg-background-muted text-foreground-muted hover:bg-card-hover hover:text-foreground'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          <div className="relative w-full lg:w-80 animate-slide-up">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted w-5 h-5" />
            <input
              type="text"
              placeholder="Search movies, TV shows..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-background-muted rounded-xl border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-foreground placeholder-foreground-muted"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

// Animated Hero Carousel component
const AnimatedHeroCarousel = ({ movies, onItemSelect }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [startX, setStartX] = useState(0);
  const [deltaX, setDeltaX] = useState(0);

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSwiping) {
        setActiveIndex((prevIndex) => (prevIndex + 1) % movies.length);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [movies.length, isSwiping]);

  // Calculate the transform value for the carousel items
  const transformX = `translateX(calc(-${activeIndex * 100}% - ${deltaX}px))`;

  const handleNext = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % movies.length);
  };

  const handlePrev = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + movies.length) % movies.length);
  };
  
  // Mouse and touch event handlers for swiping
  const handleStart = (clientX) => {
    setIsSwiping(true);
    setStartX(clientX);
    setDeltaX(0);
  };

  const handleMove = (clientX) => {
    if (!isSwiping) return;
    setDeltaX(clientX - startX);
  };

  const handleEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    
    // Determine if it was a swipe and in which direction
    const swipeThreshold = 50; // pixels
    if (deltaX > swipeThreshold) {
      handlePrev();
    } else if (deltaX < -swipeThreshold) {
      handleNext();
    }
    setDeltaX(0);
  };

  useEffect(() => {
    const carouselElement = carouselRef.current;
    if (!carouselElement) return;

    const onMouseDown = (e) => handleStart(e.clientX);
    const onMouseMove = (e) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchStart = (e) => handleStart(e.touches[0].clientX);
    const onTouchMove = (e) => handleMove(e.touches[0].clientX);
    const onTouchEnd = () => handleEnd();

    carouselElement.addEventListener('mousedown', onMouseDown);
    carouselElement.addEventListener('mousemove', onMouseMove);
    carouselElement.addEventListener('mouseup', onMouseUp);
    carouselElement.addEventListener('mouseleave', onMouseUp);
    
    carouselElement.addEventListener('touchstart', onTouchStart);
    carouselElement.addEventListener('touchmove', onTouchMove);
    carouselElement.addEventListener('touchend', onTouchEnd);

    return () => {
      carouselElement.removeEventListener('mousedown', onMouseDown);
      carouselElement.removeEventListener('mousemove', onMouseMove);
      carouselElement.removeEventListener('mouseup', onMouseUp);
      carouselElement.removeEventListener('mouseleave', onMouseUp);
      carouselElement.removeEventListener('touchstart', onTouchStart);
      carouselElement.removeEventListener('touchmove', onTouchMove);
      carouselElement.removeEventListener('touchend', onTouchEnd);
    };
  }, [isSwiping, deltaX, startX]);

  return (
    <div 
      ref={carouselRef}
      className="relative h-[400px] sm:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden shadow-card cursor-grab active:cursor-grabbing group animate-scale-in"
    >
      <div 
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: transformX, transitionProperty: isSwiping ? 'none' : 'transform' }}
      >
        {movies.map((movie, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-full h-full relative"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${movie.backdrop})` }}
            ></div>
            <div className="absolute inset-0 bg-gradient-overlay"></div>
            <div className="absolute inset-0 flex flex-col justify-end p-8 lg:p-12">
              <div className="max-w-2xl animate-slide-up">
                <h2 className="text-4xl sm:text-6xl font-black mb-4 text-foreground drop-shadow-lg leading-tight">
                  {movie?.title}
                </h2>
                <p className="text-foreground-muted text-lg mb-6 line-clamp-3">
                  {movie?.description}
                </p>
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex items-center gap-2 glass px-3 py-2 rounded-full">
                    <Star className="w-4 h-4 text-warning fill-current" />
                    <span className="text-sm font-medium">{movie?.rating?.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-2 glass px-3 py-2 rounded-full">
                    <Calendar className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium">{new Date(movie?.releaseDate).getFullYear()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button className="group flex items-center gap-3 bg-gradient-primary text-primary-foreground font-bold py-4 px-8 rounded-xl hover-lift transition-all duration-300 shadow-glow">
                    <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="currentColor" />
                    Watch Now
                  </button>
                  <button 
                    onClick={() => onItemSelect(movie)}
                    className="flex items-center gap-3 glass text-foreground font-medium py-4 px-8 rounded-xl hover:bg-card-hover transition-all duration-300"
                  >
                    <Info className="w-5 h-5" />
                    More Info
                  </button>
                  <button className="p-4 glass rounded-xl hover:bg-card-hover transition-all duration-300">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Navigation buttons */}
      <button 
        onClick={handlePrev}
        className="absolute top-1/2 -translate-y-1/2 left-4 z-20 p-3 glass rounded-full hover:bg-card-hover transition-all duration-300 opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button 
        onClick={handleNext}
        className="absolute top-1/2 -translate-y-1/2 right-4 z-20 p-3 glass rounded-full hover:bg-card-hover transition-all duration-300 opacity-0 group-hover:opacity-100"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
      
      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {movies.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === activeIndex ? 'bg-primary w-8' : 'bg-foreground/30 w-2 hover:bg-foreground/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Top Weekly Section component
const TopWeeklySection = ({ items, onItemSelect }) => {
  return (
    <div className="mt-16 animate-slide-up">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gradient-secondary mb-2">Top 10 This Week</h2>
          <div className="h-1 w-24 bg-gradient-secondary rounded-full"></div>
        </div>
        <span className="text-foreground-muted text-sm hidden sm:block">Swipe to explore →</span>
      </div>
      <div className="flex overflow-x-scroll scrollbar-hide custom-scrollbar gap-6 pb-4">
        {items.map((item, index) => (
          <div key={item.id} className="flex-none w-[150px] sm:w-[200px] relative group">
            <div className="absolute -top-4 -left-4 text-6xl font-black text-gradient opacity-20 z-10 group-hover:opacity-40 transition-opacity duration-300">
              {index + 1}
            </div>
            <ItemCard item={item} onItemSelect={onItemSelect} variant="compact" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ItemList component to display the grid of movies or TV shows
const ItemList = ({ items, onItemSelect }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-slide-up">
      {items.length > 0 ? (
        items.map((item, index) => (
          <div
            key={item.id}
            className="animate-scale-in"
            style={{ animationDelay: `${(index % 12) * 0.05}s` }}
          >
            <ItemCard item={item} onItemSelect={onItemSelect} />
          </div>
        ))
      ) : (
        <div className="col-span-full text-center text-foreground-muted text-lg py-12">
          No items found.
        </div>
      )}
    </div>
  );
};

// ItemCard component to display an individual item
const ItemCard = ({ item, onItemSelect, variant = "default" }) => {
  const isCompact = variant === "compact";

  return (
    <div 
      onClick={() => onItemSelect(item)}
      className="group relative overflow-hidden rounded-xl shadow-card hover-lift cursor-pointer bg-card border border-border-subtle transition-all duration-300"
    >
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={item.poster}
          alt={`${item.title} poster`}
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
          onError={(e) => { 
            const target = e.target as HTMLImageElement;
            target.src = "https://placehold.co/300x450/4B5563/FFFFFF?text=Image+Unavailable"; 
          }}
        />
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute inset-0 p-4 flex flex-col justify-end">
          <h3 className={`font-bold text-foreground mb-1 ${isCompact ? 'text-sm' : 'text-lg'}`}>
            {item.title}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-warning fill-current" />
              <span className="text-xs text-foreground-muted">{item.rating?.toFixed(1)}</span>
            </div>
            <span className="text-xs text-foreground-muted">
              {new Date(item.releaseDate).getFullYear()}
            </span>
          </div>
          {!isCompact && (
            <p className="text-xs text-foreground-muted line-clamp-2 mb-2">
              {item.description}
            </p>
          )}
          <span className="text-xs font-medium text-primary px-2 py-1 bg-primary/10 rounded-full w-fit">
            {item.mediaType === 'movie' ? 'Movie' : item.mediaType === 'tv' ? 'TV' : 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Movie Details component
const MovieDetails = ({ item, onClose, tmdbApiKey, tmdbApiUrl, omdbApiKey }) => {
  const [details, setDetails] = useState(null);
  const [omdbDetails, setOmdbDetails] = useState(null);
  const [trailerKey, setTrailerKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      
      try {
        setIsLoading(true);

        // Fetch primary details from TMDB
        const tmdbUrl = `${tmdbApiUrl}/${item.mediaType}/${item.id}?api_key=${tmdbApiKey}`;
        const tmdbResponse = await fetch(tmdbUrl);
        if (!tmdbResponse.ok) {
          throw new Error('Failed to fetch item details from TMDB.');
        }
        const tmdbData = await tmdbResponse.json();
        setDetails(tmdbData);

        // Fetch videos (trailers) from TMDB
        const videosUrl = `${tmdbApiUrl}/${item.mediaType}/${item.id}/videos?api_key=${tmdbApiKey}`;
        const videosResponse = await fetch(videosUrl);
        const videosData = await videosResponse.json();
        const trailer = videosData.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
        setTrailerKey(trailer?.key || null);

        // Fetch external IDs and OMDb data
        const externalIdsUrl = `${tmdbApiUrl}/${item.mediaType}/${item.id}/external_ids?api_key=${tmdbApiKey}`;
        const externalIdsResponse = await fetch(externalIdsUrl);
        const externalIdsData = await externalIdsResponse.json();
        const imdbId = externalIdsData.imdb_id;

        if (imdbId) {
          const omdbUrl = `https://www.omdbapi.com/?i=${imdbId}&apikey=${omdbApiKey}`;
          const omdbResponse = await fetch(omdbUrl);
          if (omdbResponse.ok) {
            const omdbData = await omdbResponse.json();
            setOmdbDetails(omdbData);
          }
        }
        
        setIsLoading(false);
      } catch (e) {
        console.error("Error fetching details:", e);
        setError("Failed to load details. Please try again.");
        setIsLoading(false);
      }
    };

    if (item) {
      fetchDetails();
    }
  }, [item, tmdbApiKey, tmdbApiUrl, omdbApiKey]);

  const getRating = (source) => {
    if (omdbDetails && omdbDetails.Ratings) {
      const rating = omdbDetails.Ratings.find(r => r.Source === source);
      return rating ? rating.Value : 'N/A';
    }
    return 'N/A';
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto animate-scale-in">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-card rounded-2xl shadow-card overflow-hidden max-w-6xl w-full border border-border-subtle">
          {/* Back button */}
          <button
            onClick={onClose}
            className="absolute top-6 left-6 z-10 p-3 glass rounded-full hover:bg-card-hover transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-secondary rounded-full animate-spin animate-pulse"></div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96 text-error p-8 text-center">
              {error}
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row">
              {/* Media section */}
              <div className="lg:w-1/2 relative">
                {trailerKey ? (
                  <div className="aspect-video">
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${trailerKey}?autoplay=0&mute=0`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`${item.title} Trailer`}
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-background-muted flex items-center justify-center">
                    <img
                      src={item.poster}
                      alt={`${item.title} poster`}
                      className="max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
              
              {/* Details section */}
              <div className="lg:w-1/2 p-8 lg:p-12">
                <h2 className="text-4xl font-black mb-4 leading-tight text-gradient">
                  {details?.title || details?.name}
                </h2>
                
                {details?.tagline && (
                  <p className="text-foreground-muted mb-6 text-lg italic">
                    "{details.tagline}"
                  </p>
                )}
                
                {/* Ratings */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2 glass px-4 py-2 rounded-full">
                    <Star className="w-5 h-5 text-warning fill-current" />
                    <span className="font-bold">
                      {details?.vote_average ? (details.vote_average * 10).toFixed(0) + '%' : 'N/A'}
                    </span>
                    <span className="text-sm text-foreground-muted">TMDB</span>
                  </div>
                  {omdbDetails && (
                    <>
                      <div className="flex items-center gap-2 glass px-4 py-2 rounded-full">
                        <span className="font-bold text-accent">
                          {getRating('Internet Movie Database')}
                        </span>
                        <span className="text-sm text-foreground-muted">IMDb</span>
                      </div>
                      <div className="flex items-center gap-2 glass px-4 py-2 rounded-full">
                        <span className="font-bold text-secondary">
                          {getRating('Rotten Tomatoes')}
                        </span>
                        <span className="text-sm text-foreground-muted">RT</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Overview */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-3 text-gradient-secondary">Overview</h3>
                  <p className="text-foreground-muted leading-relaxed">
                    {details?.overview || 'No overview available.'}
                  </p>
                </div>

                {/* Additional details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground-muted mb-2">Genres</h4>
                    <div className="flex flex-wrap gap-2">
                      {details?.genres?.map(genre => (
                        <span key={genre.id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {genre.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground-muted mb-2">Runtime</h4>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent" />
                      <span>
                        {details?.runtime ? `${details.runtime} min` : 
                         details?.episode_run_time?.[0] ? `${details.episode_run_time[0]} min` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground-muted mb-2">Release Date</h4>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-accent" />
                      <span>{details?.release_date || details?.first_air_date || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground-muted mb-2">Status</h4>
                    <span className="px-3 py-1 bg-success/10 text-success rounded-full text-sm">
                      {details?.status || 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-4 mt-8">
                  <button className="flex items-center gap-3 bg-gradient-primary text-primary-foreground font-bold py-3 px-6 rounded-xl hover-lift transition-all duration-300">
                    <Play className="w-5 h-5" fill="currentColor" />
                    Watch Now
                  </button>
                  <button className="flex items-center gap-3 glass text-foreground font-medium py-3 px-6 rounded-xl hover:bg-card-hover transition-all duration-300">
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
