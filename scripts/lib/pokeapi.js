// Talks to the PokéAPI GraphQL endpoint. Nothing else lives here.
const GRAPHQL_URL = 'https://graphql.pokeapi.co/v1beta2';
const PAGE_SIZE = 200;

// Per species we ask for: the default form, Megas, regional forms and Gigantamax forms.
// _like "%-gmax" has no trailing % because Gigantamax names always end with it.
const QUERY = `
  query Cards($limit: Int, $offset: Int) {
    pokemonspecies(limit: $limit, offset: $offset, order_by: { id: asc }) {
      id
      name
      pokemons(
        where: {
          _or: [
            { is_default: { _eq: true } }
            { name: { _like: "%-mega%" } }
            { name: { _like: "%-alola%" } }
            { name: { _like: "%-galar%" } }
            { name: { _like: "%-hisui%" } }
            { name: { _like: "%-paldea%" } }
            { name: { _like: "%-gmax" } }
          ]
        }
        order_by: { id: asc }
      ) {
        id
        name
        is_default
        pokemonstats {
          base_stat
          stat {
            name
          }
        }
        pokemonsprites {
          sprites
        }
      }
    }
  }
`;

async function fetchPage(offset) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: { limit: PAGE_SIZE, offset },
    }),
  });

  if (!response.ok) {
    throw new Error(`PokéAPI responded with status ${response.status}`);
  }

  const body = await response.json();
  // GraphQL reports query mistakes inside a 200 response, so check for them explicitly
  if (body.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(body.errors)}`);
  }
  return body.data.pokemonspecies;
}

export async function fetchAllSpecies() {
  const allSpecies = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchPage(offset);
    allSpecies.push(...page);
    console.log(`Fetched species ${offset + 1} to ${offset + page.length}`);
    // A short page means we reached the end
    if (page.length < PAGE_SIZE) break;
  }

  return allSpecies;
}
