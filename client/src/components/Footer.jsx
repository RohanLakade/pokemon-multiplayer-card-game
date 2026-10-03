function Footer() {
  return (
    <footer className="border-t border-white/10 py-6 text-center text-sm text-slate-400">
      <p className="mx-auto max-w-3xl px-4">
        This is a fan project. It is not affiliated with, endorsed by or sponsored by Nintendo, Game
        Freak or The Pokémon Company. Pokémon names and artwork belong to their owners. Card data
        from{' '}
        <a
          href="https://pokeapi.co"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-white"
        >
          PokéAPI
        </a>
        .
      </p>
    </footer>
  );
}

export default Footer;
