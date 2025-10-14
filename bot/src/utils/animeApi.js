import axios from 'axios';

// Base URL da API do AniList
const ANILIST_API_URL = 'https://graphql.anilist.co';

/**
 * Busca informações de um anime na API do AniList
 * @param {string} query - Nome do anime para buscar
 * @returns {Object|null} - Dados do anime ou null se não encontrado
 */
export async function searchAnime(query) {
  const graphqlQuery = `
    query ($search: String) {
      Media (search: $search, type: ANIME) {
        id
        title {
          romaji
          english
          native
        }
        description
        episodes
        duration
        status
        averageScore
        meanScore
        popularity
        favourites
        seasonYear
        season
        format
        genres
        studios {
          nodes {
            name
          }
        }
        coverImage {
          large
          medium
        }
        bannerImage
        trailer {
          id
          site
        }
        relations {
          edges {
            node {
              title {
                romaji
              }
            }
            relationType
          }
        }
        recommendations {
          nodes {
            mediaRecommendation {
              title {
                romaji
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(ANILIST_API_URL, {
      query: graphqlQuery,
      variables: { search: query }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return response.data.data.Media;
  } catch (error) {
    console.error('Erro ao buscar anime:', error);
    return null;
  }
}

/**
 * Busca múltiplos animes populares
 * @param {number} page - Página dos resultados
 * @param {number} perPage - Quantidade por página
 * @returns {Array} - Lista de animes
 */
export async function getPopularAnimes(page = 1, perPage = 10) {
  const graphqlQuery = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          title {
            romaji
            english
          }
          description
          averageScore
          coverImage {
            medium
          }
          genres
          seasonYear
          status
        }
      }
    }
  `;

  try {
    const response = await axios.post(ANILIST_API_URL, {
      query: graphqlQuery,
      variables: { page, perPage }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return response.data.data.Page.media;
  } catch (error) {
    console.error('Erro ao buscar animes populares:', error);
    return [];
  }
}

/**
 * Busca animes por gênero
 * @param {string} genre - Gênero para buscar
 * @param {number} page - Página dos resultados
 * @returns {Array} - Lista de animes do gênero
 */
export async function getAnimesByGenre(genre, page = 1) {
  const graphqlQuery = `
    query ($genre: String, $page: Int) {
      Page(page: $page, perPage: 10) {
        media(type: ANIME, genre: $genre, sort: SCORE_DESC) {
          id
          title {
            romaji
            english
          }
          description
          averageScore
          coverImage {
            medium
          }
          genres
          seasonYear
        }
      }
    }
  `;

  try {
    const response = await axios.post(ANILIST_API_URL, {
      query: graphqlQuery,
      variables: { genre, page }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return response.data.data.Page.media;
  } catch (error) {
    console.error('Erro ao buscar animes por gênero:', error);
    return [];
  }
}

/**
 * Busca um anime aleatório
 * @returns {Object|null} - Dados do anime aleatório
 */
export async function getRandomAnime() {
  try {
    // Gerar uma página aleatória
    const randomPage = Math.floor(Math.random() * 50) + 1;
    const animes = await getPopularAnimes(randomPage, 20);
    
    if (animes.length === 0) {
      return null;
    }
    
    // Retornar um anime aleatório da página
    const randomIndex = Math.floor(Math.random() * animes.length);
    return animes[randomIndex];
  } catch (error) {
    console.error('Erro ao buscar anime aleatório:', error);
    return null;
  }
}

/**
 * Busca informações de um personagem
 * @param {string} name - Nome do personagem
 * @returns {Object|null} - Dados do personagem
 */
export async function searchCharacter(name) {
  const graphqlQuery = `
    query ($search: String) {
      Character (search: $search) {
        id
        name {
          full
          native
        }
        description
        image {
          large
          medium
        }
        media {
          nodes {
            title {
              romaji
            }
            type
          }
        }
        favourites
      }
    }
  `;

  try {
    const response = await axios.post(ANILIST_API_URL, {
      query: graphqlQuery,
      variables: { search: name }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return response.data.data.Character;
  } catch (error) {
    console.error('Erro ao buscar personagem:', error);
    return null;
  }
}

/**
 * Formatar descrição do anime removendo HTML e limitando caracteres
 * @param {string} description - Descrição original
 * @param {number} maxLength - Tamanho máximo
 * @returns {string} - Descrição formatada
 */
export function formatAnimeDescription(description, maxLength = 300) {
  if (!description) return 'Sem descrição disponível';
  
  // Remover tags HTML
  const cleanDescription = description.replace(/<[^>]*>/g, '');
  
  // Limitar tamanho
  if (cleanDescription.length > maxLength) {
    return cleanDescription.substring(0, maxLength) + '...';
  }
  
  return cleanDescription;
}

/**
 * Converter status do anime para português
 * @param {string} status - Status em inglês
 * @returns {string} - Status em português
 */
export function translateAnimeStatus(status) {
  const statusMap = {
    'FINISHED': 'Finalizado',
    'RELEASING': 'Em Lançamento', 
    'NOT_YET_RELEASED': 'Não Lançado',
    'CANCELLED': 'Cancelado',
    'HIATUS': 'Em Hiato'
  };
  
  return statusMap[status] || status;
}

/**
 * Converter formato do anime para português
 * @param {string} format - Formato em inglês
 * @returns {string} - Formato em português
 */
export function translateAnimeFormat(format) {
  const formatMap = {
    'TV': 'TV',
    'TV_SHORT': 'TV Curto',
    'MOVIE': 'Filme',
    'SPECIAL': 'Especial',
    'OVA': 'OVA',
    'ONA': 'ONA',
    'MUSIC': 'Musical'
  };
  
  return formatMap[format] || format;
}