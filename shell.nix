{
  pkgs ? import <nixpkgs> { },
}:

pkgs.mkShell {
  packages = with pkgs; [
    nodejs
    corepack
    #prettierd
    #eslint_d
    #svelte-language-server
    #typescript-language-server
    #bash-language-server
    #vscode-langservers-extracted
    #tailwindcss-language-server
    #nil
  ];
}
