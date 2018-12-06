import React, { Component } from 'react';
import { GENRE, BASE, TAILLE, COULEUR, STORELOCATION } from './Variantes'
import { Layout, TextField, FormLayout, Select, Button, ChoiceList, Banner } from '@shopify/polaris';

export default class Main extends Component {
    constructor(props) {
        super(props);
        this.state = {
            storeLocation: 0,
            productCount: 0,

            fetched: [],

            gender: "",
            base: "",
            size: "",
            color: "",

            listProductsToModify: [],

            variantIds: [],
            inventoryIds: [],

            quantityInput: "",
            priceInput: "",
            isApplyInventoryLoading: false,
            isApplyPricesLoading: false,
            isApplyInventoryDisabled: false,
            isApplyPricesDisabled: false,
            disableTextInputs: false,

            numModifLeft: 0,
            disableGenreEtBase: true,
            disableCouleur: true,
            disableTaille: true,

            doDisplayWarningMessage: false,
            displayCurrentlyModifiedProduct: ""
        }
    }


    componentDidMount = () => {
        this.getLocationAndCount();
    }

    getLocationAndCount = () => {
        let storeLocation;
        let productCount;
        return fetch('/shopify/api/locations.json')
            .then(response => response.json())
            .then(responseJson => {
                storeLocation = responseJson.locations[0].id
                return fetch('shopify/api/products/count.json')
            })
            .then(response => response.json())
            .then(responseJson => {
                productCount = responseJson.count
                this.setState({
                    storeLocation: storeLocation,
                    productCount: productCount
                })
                this.fetchAllProducts();
            })
    }


    fetchAllProducts = () => {
        this.setState({ listProducts: [] })

        let nbPages = Math.ceil(this.state.productCount / 250)
        let delayIncrement = 500;
        let delay = 0;
        let obj = { products: [] };
        var fetches = [];

        for (let i = 0; i < nbPages; i++) {
            console.log("in loop, i:", i);
            fetches.push(
                new Promise(resolve => setTimeout(resolve, delay)).then(() =>

                    fetch('/shopify/api/products.json?limit=250&page=' + (i + 1)))

                    .then(response => response.json())
                    .then(responseJson => {
                        console.log(i, "call", responseJson)
                        obj.products = [...obj.products, ...responseJson.products]

                    })
            )
            delay += delayIncrement
        }
        Promise.all(fetches).then(() => {
            console.log("all products fetched", obj);
            this.putDataInState(obj);
        })
    }
    //  REFACTORING: this could probably be two lines of code instead of 5
    putDataInState = (object) => {
        let list = [];
        object.products.forEach(product => {
            list.push(product);
        })
        this.setState({
            fetched: list,
            disableGenreEtBase: false,
            disableCouleur: false,
            disableTaille: false
        }, () => this.filterProducts())
    }


    filterProducts = () => {
        let filterGender = this.state.fetched.filter((product) => product.tags.includes(this.state.gender));
        let filterBase = filterGender.filter((product) => product.product_type.includes(this.state.base));
        let filterSize = [...filterBase];
        filterSize.forEach((product) => {
            if (this.state.size !== "") {
                let newVariants = [];
                product.variants.forEach((variant) => {
                    if (variant.option1 === this.state.size) newVariants.push(variant);
                })
                product.variants = newVariants
            }
        })
        let filterColor = [...filterSize];
        filterColor.forEach((product) => {
            if (this.state.color !== "") {
                let newVariants = [];
                product.variants.forEach((variant) => {
                    if (variant.option2 === this.state.color) newVariants.push(variant);
                })
                product.variants = newVariants
            }
        })

        let letVariantIds = [];
        let letInventoryIds = [];
        filterColor.forEach((product) => {
            product.variants.forEach((variant) => {
                letVariantIds.push(variant.id);
                letInventoryIds.push(variant.inventory_item_id);
            })
        })

        this.setState({
            listProductsToModify: filterColor,
            variantIds: letVariantIds,
            inventoryIds: letInventoryIds
        })
    }


    //  Apply Changes
    applyChangesToInventory = () => {
        let result = window.confirm(
            "Vous êtes sur le point de modifier l'inventaire de " + this.state.inventoryIds.length + " variantes.\nÊtes-vous sûr de vouloir continuer?"
        );

        let delayIncrement = 500;
        let delay = 0;

        if (result == true) {
            this.setState({
                doDisplayWarningMessage: true,
                isApplyInventoryLoading: true,
                isApplyPricesDisabled: true,
                disableTextInputs: true,
                disableGenreEtBase: true,
                disableCouleur: true,
                disableTaille: true
            })
            let array = new Array();
            var fetches = [];
            for (let i = 0; i < this.state.inventoryIds.length; i++) {
                let inventoryBody = {
                    "inventory_item_id": this.state.inventoryIds[i],
                    "location_id": this.state.storeLocation,
                    "available": Number(this.state.quantityInput)
                };
                fetches.push(
                    new Promise(resolve => setTimeout(resolve, delay)).then(() =>
                        fetch('/shopify/api/inventory_levels/set.json', {
                            method: "POST",
                            body: JSON.stringify(inventoryBody)
                        }))
                        .then(response => {
                            return response.json()
                        })
                        .then(responseJson => {
                            console.log(responseJson)
                            console.log(responseJson[responseJson.length])
                            //this.setState({ displayCurrentlyModifiedProduct: responseJson[responseJson.length] })
                            array.push(responseJson);
                        })
                );
                delay += delayIncrement
            }

            Promise.all(fetches).then(() => {
                console.log("all", array.length, "fetches done")
                this.setState({ isApplyInventoryLoading: false })
                alert("Les " + array.length + " variantes ont étés modifiés avec succès. La page va maintenant être rafrachie.");
                location.reload();
            });
        }
    }

    //  TODO: Ajouter un throw error + vérification que les produits ciblés sont maintenant modifiés
    applyChangesToPrice = () => {
        let result = window.confirm(
            "Vous êtes sur le point de modifier le prix de " + this.state.inventoryIds.length + " variantes.\nÊtes-vous sûr de vouloir continuer?"
        );

        let delayIncrement = 500;
        let delay = 0;

        if (result == true) {
            this.setState({
                doDisplayWarningMessage: true,
                isApplyPricesLoading: true,
                isApplyInventoryDisabled: true,
                disableTextInputs: true,
                disableGenreEtBase: true,
                disableCouleur: true,
                disableTaille: true
            })
            let array = new Array();
            var fetches = [];
            for (let i = 0; i < this.state.variantIds.length; i++) {
                let priceBody = {
                    "variant": {
                        "id": this.state.variantIds[i],
                        "price": this.state.priceInput
                    }
                }
                fetches.push(
                    new Promise(resolve => setTimeout(resolve, delay)).then(() =>
                        fetch('/shopify/api/variants/' + this.state.variantIds[i] + '.json', {
                            method: "PUT",
                            body: JSON.stringify(priceBody)
                        }))
                        .then(response => response.json())
                        .then(responseJson => {
                            console.log(responseJson)
                            console.log(responseJson[responseJson.length])
                            //this.setState({ displayCurrentlyModifiedProduct: responseJson[responseJson.length] })
                            array.push(responseJson)
                        })
                );
                delay += delayIncrement
            }
            Promise.all(fetches).then(() => {
                console.log("all", array.length, "fetches done")
                this.setState({ isApplyPricesLoading: false })
                alert("Les " + array.length + " variantes ont étés modifiés avec succès. La page va maintenant être rafrachie.");
                location.reload();
            });
        }
    }


    //  Handlers
    handleSelectChange = (value) => { this.setState({ categorySelect: value }) }
    handleSearchChange = (value) => { this.setState({ searchInput: value }) }
    handleQuantityChange = (value) => { this.setState({ quantityInput: value }) }
    handlePriceChange = (value) => { this.setState({ priceInput: value }) }

    handleGenderChange = (value) => { this.setState({ gender: value }, () => this.filterProducts()); }
    handleBaseChange = (value) => { this.setState({ base: value }, () => this.filterProducts()); }
    handleSizeChange = (value) => { this.setState({ size: value, disableTaille: true }, () => this.filterProducts()); }
    handleColorChange = (value) => { this.setState({ color: value, disableCouleur: true }, () => this.filterProducts()); }


    render() {
        return (
            <div>
                <div>Variantes à modifier: {this.state.variantIds.length}</div>

                <div style={{ height: '10px' }} />
                <FormLayout>
                    <Select
                        label="Genre"
                        options={GENRE}
                        onChange={this.handleGenderChange}
                        value={this.state.gender}
                        disabled={this.state.disableGenreEtBase}
                    />
                    <Select
                        label="Base"
                        options={BASE}
                        onChange={this.handleBaseChange}
                        value={this.state.base}
                        disabled={this.state.disableGenreEtBase}
                    />
                    <Select
                        label="Taille"
                        options={TAILLE}
                        onChange={this.handleSizeChange}
                        value={this.state.size}
                        disabled={this.state.disableTaille}
                    />
                    <Select
                        label="Couleur"
                        options={COULEUR}
                        onChange={this.handleColorChange}
                        value={this.state.color}
                        disabled={this.state.disableCouleur}
                    />
                </FormLayout>

                <div style={{ height: '15px' }} />

                <FormLayout.Group>
                    <TextField disabled={this.state.disableTextInputs} label="Quantité" type="number" onChange={this.handleQuantityChange} value={this.state.quantityInput} />
                    <TextField disabled={this.state.disableTextInputs} label="Prix" prefix="$" type="number" onChange={this.handlePriceChange} value={this.state.priceInput} />
                </FormLayout.Group>

                <FormLayout.Group>
                    <Button primary
                        fullWidth={true}
                        onClick={this.applyChangesToInventory}
                        loading={this.state.isApplyInventoryLoading}
                        disabled={this.state.isApplyInventoryDisabled} >
                        Changer l'Inventaire
                    </Button>

                    <Button primary
                        fullWidth={true}
                        onClick={this.applyChangesToPrice}
                        loading={this.state.isApplyPricesLoading}
                        disabled={this.state.isApplyPricesDisabled} >
                        Changer le Prix
                    </Button>
                </FormLayout.Group>

                <div style={{ height: "30px" }} />

               {this.state.doDisplayWarningMessage && <h2>NE PAS FERMER CETTE FENÊTRE</h2>}
               {/* {this.state.doDisplayWarningMessage && <h5>En cours... ID:{this.state.displayCurrentlyModifiedProduct}</h5>} */}
            </div >
        )
    }
}
