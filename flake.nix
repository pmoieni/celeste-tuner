{
  inputs = {
    systems.url = "github:nix-systems/default";
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs =
    {
      self,
      systems,
      nixpkgs,
    }:
    let
      forEachSystem =
        f:
        nixpkgs.lib.genAttrs (import systems) (
          system:
          let
            fArgs = builtins.functionArgs f;
            pkgs = import nixpkgs {
              inherit system;
            };
          in
          if fArgs == { } then (f pkgs) else (f { inherit system pkgs; })
        );
    in
    {
      devShells = forEachSystem (pkgs: {
        default = import ./shell.nix {
          inherit pkgs;
        };
      });
    };
}
