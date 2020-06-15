# Add following line to ~/.zshrc:
# source /path/to/where-has-my-money-gone/scripts/zsh-autocomplete.sh

script_file="$(realpath $(dirname $0)/../build/main-cli.js)"
alias ynab="node $script_file"
compdef 'compadd revolut nordea swedbank' ynab
setopt complete_aliases
